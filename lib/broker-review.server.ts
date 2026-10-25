import { prisma } from "./prisma";
import { currentBrokerSnapshot } from "./premium-quality.server";
import { readPremiumAssessment } from "./premium-quality-store.server";
import { selectAutopilotImages, validateAutopilotImageAnalyses, REVIEW_LABELS, type AutopilotImageCandidate } from "./autopilot-image-quality";
import { validateBrokerDecisions, type BrokerImageDecision } from "./broker-review";
export async function loadBrokerReview(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, userId, archivedAt: null }, include: { images: true } });
  if (!listing) throw Error("LISTING_NOT_FOUND");
  const current = await currentBrokerSnapshot(listing);
  const raw = await prisma.premiumQualityAssessment.findFirst({ where: { userId, listingId, kind: "broker_images", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  const stored = raw && await readPremiumAssessment(userId, raw.id, "broker_images");
  const saved = stored?.payload as { snapshot: string; decisions: BrokerImageDecision[]; order: string[]; primary: string } | undefined;
  const savedByVersion = saved?.decisions ?? [];
  const visionRow = await prisma.premiumQualityAssessment.findFirst({where:{userId,listingId,kind:"broker_vision",expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
  const visionRecord = visionRow && await readPremiumAssessment(userId,visionRow.id,"broker_vision");
  const visionImages = (visionRecord?.payload as {images?:{id:string;analysis:string;analyzedAt:unknown}[]}|undefined)?.images ?? [];
  const finalRow = await prisma.premiumQualityAssessment.findFirst({where:{userId,listingId,kind:"final",expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
  const finalRecord = finalRow && await readPremiumAssessment(userId,finalRow.id,"final");
  const finalImages = (finalRecord?.payload as {images?:AutopilotImageCandidate[]}|undefined)?.images ?? [];
  const images = current.images.map(image=>{
    let candidate: AutopilotImageCandidate | null = null;
    try {
      const boundVision = visionImages.some(proof=>proof.id===image.id && proof.analysis===image.analysis && JSON.stringify(proof.analyzedAt)===JSON.stringify(image.analyzedAt));
      const finalImage = finalImages.find(proof=>proof.contentFingerprint===image.fingerprint);
      const analysis = boundVision ? JSON.parse(image.analysis ?? "null") : finalImage ? {...finalImage.analysis,contentFingerprint:finalImage.contentFingerprint} : null;
      if (!analysis) throw Error("TRUSTED_IMAGE_AUDIT_REQUIRED");
      const validated = validateAutopilotImageAnalyses([{...analysis,room:analysis?.room??"",imageIndex:1}],1)[0];
      if (!image.decoded || analysis?.contentFingerprint !== image.fingerprint || image.analysisStatus !== "analyzed") throw Error("NOT_ANALYZED");
      candidate = {imageId:image.id,fileName:image.fileName,contentFingerprint:image.fingerprint,comparison:image.comparison,analysis:validated};
    } catch { /* Missing or invalid analyses are never treated as checked. */ }
    const reasons = candidate ? selectAutopilotImages([candidate]).entries[0].reasons : ["IMAGE_ANALYSIS_REQUIRED"];
    const decision = savedByVersion.find(x=>x.imageId===image.id && x.version===image.version);
    return {...image,candidate,reasons,reasonLabels:reasons.map(reason=>REVIEW_LABELS[reason]??"Bildanalyse fehlt oder ist ungültig"),decision:decision?.decision??"pending",note:decision?.note??""};
  });
  const checkedCandidates = images.flatMap(image=>image.candidate?[image.candidate]:[]);
  const jointSelection = selectAutopilotImages(checkedCandidates);
  for (const image of images) {
    const joint = jointSelection.entries.find(entry=>entry.imageId===image.id);
    if (joint) { image.reasons = joint.reasons; image.reasonLabels = joint.reasons.map(reason=>REVIEW_LABELS[reason]??"Bildprüfung erforderlich"); }
  }
  const draftRow=await prisma.premiumQualityAssessment.findFirst({where:{userId,listingId,kind:"autopilot_draft",expiresAt:{gt:new Date()}},orderBy:{createdAt:"desc"}});
  const draft=draftRow&&await readPremiumAssessment(userId,draftRow.id,"autopilot_draft");
  const currentFactsRecord=draft&&(!finalRecord||draft.createdAt>finalRecord.createdAt)?draft:finalRecord;
  const previousFacts = (currentFactsRecord?.payload as {facts?:Record<string,unknown>}|undefined)?.facts ?? {};
  return {listing,current,images,previousFacts,draft,review:stored && saved?.snapshot===current.snapshot ? {id:stored.id,...saved}:null};
}
export function reviewedCandidates(state: Awaited<ReturnType<typeof loadBrokerReview>>) {
  if (!state.review) throw Error("CURRENT_IMAGE_REVIEW_REQUIRED");
  const accepted = validateBrokerDecisions(state.images.map(x=>({id:x.id,version:x.version,reasons:x.reasons,analyzed:!!x.candidate,titleScore:x.candidate?.analysis.titleScore})),state.review.decisions,state.review.order,state.review.primary);
  const images = accepted.map((id,index)=>{const candidate=state.images.find(x=>x.id===id)!.candidate!;return {...candidate,analysis:{...candidate.analysis,imageIndex:index+1}};});
  return {images,policy:{confirmedImageIds:accepted,order:accepted,primaryImageId:state.review.primary}};
}
