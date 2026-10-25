import { canUseListingCoreForUser } from "@/lib/listing-access";
import { describePremiumQualityReasons } from "@/lib/premium-quality-gate.server";
import { NextResponse, type NextRequest } from "next/server";
import OpenAI from "openai";
import { getAuthenticatedUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadBrokerReview, reviewedCandidates } from "@/lib/broker-review.server";
import { savePremiumAssessment } from "@/lib/premium-quality-store.server";
import { validateBrokerDecisions, publicationContent, type BrokerImageDecision } from "@/lib/broker-review";
import { checkAndRecordPremiumQuality, isListingPremiumQualityReady, isListingBrokerApproved, premiumSources, premiumSourceContext } from "@/lib/premium-quality.server";
import type { PremiumFacts } from "@/lib/premium-quality-gate.server";
import { resumeReviewedAutopilot, resumeClaimId } from "@/lib/autopilot-resume.server";
export const runtime = "nodejs";
type Context = {params:Promise<{id:string}>};
export async function GET(request: NextRequest, context: Context) {
  const user=await getAuthenticatedUser(request);if(!user)return NextResponse.json({error:"Bitte anmelden."},{status:401});
  try {const {id}=await context.params;const state=await loadBrokerReview(user.id,id);
    const parsedVariants=JSON.parse(state.listing.generatedVariants??"[]");
    const hasTexts=Array.isArray(parsedVariants)&&parsedVariants.some(v=>typeof v?.text==="string"&&v.text.trim());
    const claim=state.draft&&await prisma.premiumQualityAssessment.findFirst({where:{id:resumeClaimId(user.id,id,state.draft.id),userId:user.id,kind:"autopilot_resume"}});
    return NextResponse.json({autopilotContinuation:{pending:!!state.draft&&!hasTexts,claimed:!!claim,canGenerate:!!state.draft&&!hasTexts&&!claim&&!!state.review},snapshot:state.current.snapshot,images:state.images.map(image=>({id:image.id,version:image.version,reasons:image.reasons,reasonLabels:image.reasonLabels,decision:image.decision,note:image.note,position:image.position,isPrimary:image.isPrimary})),facts:state.previousFacts,reviewedContent:{facts:publicationContent({...state.previousFacts,...state.listing}),variants:JSON.parse(state.listing.generatedVariants??"[]")},technicalReady:await isListingPremiumQualityReady(user.id,id),brokerApproved:await isListingBrokerApproved(user.id,id)}, {headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({error:"Prüfstand konnte nicht geladen werden."},{status:422});}
}
export async function POST(request: NextRequest, context: Context) {
  const user=await getAuthenticatedUser(request);if(!user)return NextResponse.json({error:"Bitte anmelden."},{status:401});
  try {const {id}=await context.params;const body=await request.json();const state=await loadBrokerReview(user.id,id);
    if(body.snapshot!==state.current.snapshot)throw Error("REVIEW_STALE_RELOAD_REQUIRED");
    if(body.action==="images") {
      const decisions=body.decisions as BrokerImageDecision[];const order=body.order as string[];const accepted=validateBrokerDecisions(state.images.map(x=>({id:x.id,version:x.version,reasons:x.reasons,analyzed:!!x.candidate,titleScore:x.candidate?.analysis.titleScore})),decisions,order,body.primary);
      const storedOrder=[...accepted,...order.filter(imageId=>!accepted.includes(imageId))];
      await prisma.$transaction(storedOrder.map((imageId,position)=>prisma.listingImage.update({where:{id:imageId},data:{position,isPrimary:imageId===body.primary}})));
      const after=await loadBrokerReview(user.id,id);
      if(after.images.some(image=>!decisions.some(x=>x.imageId===image.id&&x.version===image.version)))throw Error("IMAGE_CHANGED_DURING_REVIEW");
      await savePremiumAssessment(user.id,"broker_images",{snapshot:after.current.snapshot,decisions,order:storedOrder,primary:body.primary},id);
      return NextResponse.json({success:true,publicationReady:false});
    }
    if(body.action==="generate") {
      if(!await canUseListingCoreForUser({userId:user.id,plan:user.plan,listingId:id}))return NextResponse.json({error:"LISTING_ACCESS_REQUIRED"},{status:403});
      if(body.manualConfirmed!==true)throw Error("EXPLICIT_FACT_CONFIRMATION_REQUIRED");
      return NextResponse.json(await resumeReviewedAutopilot(user.id,id,body.snapshot,body.facts??{},new OpenAI({apiKey:process.env.OPENAI_API_KEY})));
    }
    if(body.action==="check") {
      if (process.env.NODE_ENV !== "development" && !await canUseListingCoreForUser({userId:user.id,plan:user.plan})) return NextResponse.json({error:"LISTING_ACCESS_REQUIRED"},{status:403});
      if(body.manualConfirmed!==true)throw Error("EXPLICIT_FACT_CONFIRMATION_REQUIRED");
      const selected=reviewedCandidates(state);
      const metadata=body.facts??{};
      // Stored listing fields are authoritative. Only fields absent from the model
      // may be supplied as explicitly reviewed offer metadata.
      const extraKeys=["locale","currency","marketingType","transactionType","rentPeriod","priceOnRequestConfirmed","commercialArea","commercialUse"];
      const extras=Object.fromEntries(extraKeys.filter(key=>metadata[key]!==undefined).map(key=>[key,metadata[key]]));
      const facts={...publicationContent({...state.previousFacts,...extras,...state.listing}),verifiedFeatures:state.listing.highlights??""} as PremiumFacts;
      const source=await prisma.premiumQualityAssessment.findFirst({where:{userId:user.id,listingId:id,kind:"expose",expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
      const sourceAudit=await premiumSources(user.id,source?.id,facts,true);
      const variants=JSON.parse(state.listing.generatedVariants??"null");
      if(!Array.isArray(variants)||variants.length!==3)throw Error("THREE_VALID_TEXTS_REQUIRED");
      const decision=await checkAndRecordPremiumQuality({userId:user.id,listingId:id,facts,variants,sourceAudit,sourceContext:await premiumSourceContext(user.id,source?.id),images:selected.images,imageReview:selected.policy,brokerImageReviewId:state.review!.id,bindingImages:[...state.images].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(x=>x.fingerprint),openai:new OpenAI({apiKey:process.env.OPENAI_API_KEY})});
      if((await loadBrokerReview(user.id,id)).current.snapshot!==body.snapshot)throw Error("REVIEW_CHANGED_DURING_AUDIT");
      return NextResponse.json({...decision,error:decision.ready?undefined:describePremiumQualityReasons(decision.reasons),technicalReady:decision.ready,brokerApproved:false}, {status:decision.ready?200:422});
    }
    if(body.action==="approve") {
      if(body.confirmed!==true||!await isListingPremiumQualityReady(user.id,id))throw Error("CURRENT_QUALITY_AND_EXPLICIT_APPROVAL_REQUIRED");
      const final=await prisma.premiumQualityAssessment.findFirst({where:{userId:user.id,listingId:id,kind:"final",expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
      if(!final||(await loadBrokerReview(user.id,id)).current.snapshot!==body.snapshot)throw Error("REVIEW_STALE_RELOAD_REQUIRED");
      await savePremiumAssessment(user.id,"broker_approval",{snapshot:body.snapshot,assessmentId:final.id,explicitlyConfirmed:true},id);
      return NextResponse.json({success:true,brokerApproved:await isListingBrokerApproved(user.id,id),publicationTriggered:false});
    }
    throw Error("UNKNOWN_REVIEW_ACTION");
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"REVIEW_FAILED",brokerApproved:false},{status:422});}
}
