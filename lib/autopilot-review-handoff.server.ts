import { normalizeUserPlan } from './plans';
import { randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { readPremiumAssessment } from './premium-quality-store.server';
import { stableQualityHash, PREMIUM_QUALITY_VERSION, premiumNumber, type PremiumFacts } from './premium-quality-gate.server';
import { fingerprintImageContent } from './image-content-fingerprint.server';
import { putObject, deleteObjects } from './storage/storage.server';
import { isImageReviewTransition } from './autopilot-review-transition';
import type { AutopilotImageCandidate } from './autopilot-image-quality';
import type { Prisma } from '@prisma/client';

// Persist the already audited inputs, then use the existing broker-review/resume
// service. This operation neither confirms images nor grants publication access.
export async function createAutopilotImageReviewDraft(userId:string, assessmentId:unknown, files:File[], plan:unknown) {
  const record=await readPremiumAssessment(userId,assessmentId,'final');
  const payload=record?.payload as unknown as {decision:unknown;facts:PremiumFacts;sourceAudit:{status:string;sources:{kind:string;reference:string}[]};images:AutopilotImageCandidate[]};
  if(!record||record.listingId||!isImageReviewTransition(payload?.decision)||payload.sourceAudit?.status!=='passed')throw Error('REVIEW_HANDOFF_ASSESSMENT_INVALID');
  const sourceId=payload.sourceAudit.sources.find(x=>x.kind==='expose')?.reference;
  // Sources contain the validated receipt ID, never a client-supplied replacement.
  if(!sourceId||!await readPremiumAssessment(userId,sourceId,'expose'))throw Error('PREMIUM_SOURCE_AUDIT_REQUIRED');
  if(!Array.isArray(payload.images)||!files.length||files.length!==payload.images.length||files.length>20)throw Error('REVIEW_HANDOFF_IMAGES_INVALID');
  const inputs:{file:File;bytes:Buffer;candidate:AutopilotImageCandidate}[]=[];
  for(let i=0;i<files.length;i++){
    const file=files[i];
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>3*1024*1024)throw Error('REVIEW_HANDOFF_IMAGES_INVALID');
    const bytes=Buffer.from(await file.arrayBuffer());
    if(await fingerprintImageContent(bytes)!==payload.images[i].contentFingerprint)throw Error('REVIEW_HANDOFF_IMAGE_CHANGED');
    inputs.push({file,bytes,candidate:payload.images[i]});
  }
  const claim={status:'CLAIMED_NO_RESTART',assessmentId:record.id};
  await prisma.premiumQualityAssessment.create({data:{id:'handoff_'+stableQualityHash({userId,assessmentId:record.id}),userId,kind:'autopilot_review_handoff',version:PREMIUM_QUALITY_VERSION,snapshotHash:stableQualityHash(claim),payload:claim,expiresAt:record.expiresAt}});
  const single=normalizeUserPlan(plan)==='free';
  const listingId=randomUUID(),uploaded:string[]=[];
  try {
    const stored:Awaited<ReturnType<typeof putObject>>[]=[];
    for(const input of inputs){
      const extension=input.file.type==='image/png'?'png':input.file.type==='image/webp'?'webp':'jpg';
      const key=`listing-images/${listingId}/${randomUUID()}.${extension}`;
      uploaded.push(key);
      stored.push(await putObject({pathname:key,body:input.bytes,contentType:input.file.type}));
    }
    const facts=payload.facts;
    await prisma.$transaction(async tx=>{
      await tx.listing.create({data:{id:listingId,userId,paymentModel:single?'single_object':'subscription',unlockStatus:single?'locked':'included',projectName:String(facts.projectName??facts.propertyType??'Autopilot-Entwurf'),countryCode:String(facts.countryCode??''),market:String(facts.market??''),location:String(facts.location??''),postalCode:String(facts.postalCode??''),street:String(facts.street??''),propertyType:String(facts.propertyType??''),rooms:premiumNumber(facts.rooms),livingArea:premiumNumber(facts.livingArea),plotArea:premiumNumber(facts.plotArea),price:premiumNumber(facts.price),highlights:String(facts.verifiedFeatures??facts.highlights??''),generatedVariants:null}});
      const vision=[];
      for(let i=0;i<inputs.length;i++){
        const candidate=inputs[i].candidate;
        const imageId=randomUUID(),analyzedAt=new Date();
        const analysis=JSON.stringify({...candidate.analysis,imageId,contentFingerprint:candidate.contentFingerprint});
        await tx.listingImage.create({data:{id:imageId,listingId,url:stored[i].url,storageKey:stored[i].pathname,fileName:candidate.fileName??inputs[i].file.name,mimeType:inputs[i].file.type,sizeBytes:inputs[i].file.size,position:i,isPrimary:false,analysis,analysisStatus:'analyzed',analyzedAt}});
        vision.push({id:imageId,analysis,analyzedAt:analyzedAt.toISOString()});
      }
      for(const [kind,value]of [['broker_vision',{images:vision}],['autopilot_draft',{facts,sourceAssessmentId:sourceId}]] as const){
        const clean=JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
        await tx.premiumQualityAssessment.create({data:{userId,listingId,kind,version:PREMIUM_QUALITY_VERSION,snapshotHash:stableQualityHash(clean),payload:clean,expiresAt:record.expiresAt}});
      }
    });
    return {listingId,reviewUrl:`/cockpit/${encodeURIComponent(listingId)}/edit?review=images`,brokerApproved:false,publicationTriggered:false};
  }catch(error){if(uploaded.length)await deleteObjects(uploaded).catch(()=>{});throw error;}
}
