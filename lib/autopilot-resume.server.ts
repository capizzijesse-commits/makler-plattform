import { prisma } from './prisma';
import { loadBrokerReview, reviewedCandidates } from './broker-review.server';
import { readPremiumAssessment, savePremiumAssessment } from './premium-quality-store.server';
import { publicationContent } from './broker-review';
import { stableQualityHash, PREMIUM_QUALITY_VERSION, evaluatePremiumQualityGate, type PremiumFacts } from './premium-quality-gate.server';
import { premiumSources, premiumSourceContext, checkAndRecordPremiumQuality } from './premium-quality.server';
import { generateListingTextVariants } from './listing-text-engine.server';
import type OpenAI from 'openai';

export const resumeClaimId=(userId:string,listingId:string,draftId:string)=>'resume_'+stableQualityHash({userId,listingId,draftId});
export async function resumeReviewedAutopilot(userId:string,listingId:string,snapshot:string,metadata:Record<string,unknown>,openai:OpenAI){
 const state=await loadBrokerReview(userId,listingId);
 if(state.current.snapshot!==snapshot)throw Error('REVIEW_STALE_RELOAD_REQUIRED');
 const selected=reviewedCandidates(state); // Requires every stored decision, including rejections.
 const row=await prisma.premiumQualityAssessment.findFirst({where:{userId,listingId,kind:'autopilot_draft',expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'}});
 const draft=row&&await readPremiumAssessment(userId,row.id,'autopilot_draft');
 if(!draft)throw Error('AUTOPILOT_DRAFT_REQUIRED');
 const payload=draft.payload as {facts:PremiumFacts;sourceAssessmentId:string};
 const existing=JSON.parse(state.listing.generatedVariants??'null');
 if(Array.isArray(existing)&&existing.some(v=>v?.text?.trim()))throw Error('AUTOPILOT_TEXTS_ALREADY_EXIST');
 const allowed=['locale','currency','marketingType','transactionType','rentPeriod','priceOnRequestConfirmed','commercialArea','commercialUse'];
 const extras=Object.fromEntries(allowed.filter(key=>metadata[key]!==undefined).map(key=>[key,metadata[key]]));
 const stored=Object.fromEntries(Object.entries(publicationContent(state.listing)).filter(([,value])=>value!==null&&value!==undefined));
 const facts:PremiumFacts={...payload.facts,...stored,...extras,verifiedFeatures:state.listing.highlights??'',imageAnalysis:'',imageEvidence:[]};
 const sourceAudit=await premiumSources(userId,payload.sourceAssessmentId,facts,true);
 if(sourceAudit.status!=='passed'||sourceAudit.conflicts.some(x=>x.status==='unresolved'))throw Error('PREMIUM_SOURCE_AUDIT_REQUIRED');
 const preflight=evaluatePremiumQualityGate({facts,sourceAudit,variants:[],images:selected.images,imageReview:selected.policy,expectedImageCount:selected.images.length});
 const factualReasons=preflight.reasons.filter(x=>!['TEXT_QUALITY_FAILED','FACT_AUDIT_NOT_PASSED'].includes(x));
 if(factualReasons.length)throw Error('AUTOPILOT_RESUME_FACTS_OR_IMAGES_INVALID: '+factualReasons.join(','));
 const claimPayload={status:'CLAIMED_NO_RESTART',snapshot,draftId:draft.id};
 try{await prisma.premiumQualityAssessment.create({data:{id:resumeClaimId(userId,listingId,draft.id),userId,listingId,kind:'autopilot_resume',version:PREMIUM_QUALITY_VERSION,payload:claimPayload,snapshotHash:stableQualityHash(claimPayload),expiresAt:new Date(Date.now()+24*60*60*1000)}});}catch(error){if((error as {code?:string}).code==='P2002')throw Error('AUTOPILOT_RESUME_ALREADY_CLAIMED');throw error;}
 // No retry, no release of the claim, including ambiguous provider failures.
 const result=await generateListingTextVariants(facts,{openai});
 if((await loadBrokerReview(userId,listingId)).current.snapshot!==snapshot)throw Error('REVIEW_CHANGED_DURING_GENERATION');
 const generatedVariants=JSON.stringify(result.variants),savedAt=new Date();
 const updated=await prisma.listing.updateMany({where:{id:listingId,userId,updatedAt:state.listing.updatedAt},data:{generatedVariants,updatedAt:savedAt}});
 if(updated.count!==1)throw Error('REVIEW_CHANGED_DURING_GENERATION');
 const after=await loadBrokerReview(userId,listingId);
 if(after.listing.updatedAt.getTime()!==savedAt.getTime()||after.images.some(x=>!state.images.some(y=>x.id===y.id&&x.version===y.version)))throw Error('REVIEW_CHANGED_DURING_GENERATION');
 const review=await savePremiumAssessment(userId,'broker_images',{...state.review,snapshot:after.current.snapshot},listingId);
 const fresh=await loadBrokerReview(userId,listingId),finalSelection=reviewedCandidates(fresh);
 const decision=await checkAndRecordPremiumQuality({userId,listingId,facts,variants:result.variants,sourceAudit,sourceContext:await premiumSourceContext(userId,payload.sourceAssessmentId),images:finalSelection.images,imageReview:finalSelection.policy,brokerImageReviewId:review.id,bindingImages:[...fresh.images].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(x=>x.fingerprint),openai});
 if((await loadBrokerReview(userId,listingId)).current.snapshot!==fresh.current.snapshot)throw Error('REVIEW_CHANGED_DURING_AUDIT');
 return {...decision,textsGenerated:true,brokerApproved:false,publicationTriggered:false};
}
