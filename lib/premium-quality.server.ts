import { createHash } from "node:crypto";
import { publicationContent, brokerSnapshot, imageReviewVersion, type BrokerImagePolicy } from "./broker-review";
import { auditPremiumTexts } from "./premium-text-audit.server";
import type OpenAI from "openai";
import { prisma } from "./prisma";
import { getObjectBytes } from "./storage/storage.server";
import { fingerprintImageContent, imageComparisonEvidence } from "./image-content-fingerprint.server";
import { requestAutopilotImageAnalyses } from "./autopilot-image-analysis.server";
import { collectExposeCoreSourceFacts, confirmExposeFactConflicts, type ExposeCoreEvidence } from "./expose-core-fact-conflicts";
import { evaluatePremiumQualityGate, premiumPropertyKind, arePremiumCoreFactsDocumented, premiumNumber, stableQualityHash, type PremiumFacts, type PremiumSourceAudit } from "./premium-quality-gate.server";
import { readPremiumAssessment, savePremiumAssessment } from "./premium-quality-store.server";
import type { ListingTextVariant } from "./listing-text-quality";
import type { AutopilotImageCandidate } from "./autopilot-image-quality";

export function listingQualityBinding(facts: PremiumFacts, variants: ListingTextVariant[], hashes: string[]) {
  return stableQualityHash({
    ...publicationContent(facts as Record<string, unknown>),
    market: String(facts.market ?? ""), location: String(facts.location ?? "").trim(),
    propertyType: String(facts.propertyType ?? "").trim(),
    street: String(facts.street ?? "").trim(), postalCode: String(facts.postalCode ?? "").trim(),
    rooms: premiumNumber(facts.rooms), livingArea: premiumNumber(facts.livingArea),
    price: premiumNumber(facts.price), plotArea: premiumNumber(facts.plotArea),
    highlights: typeof facts.highlights === "string" ? facts.highlights.trim() : "",
    variants, images: hashes,
  });
}
export async function checkAndRecordPremiumQuality(input: {
  userId: string; listingId?: string; facts: PremiumFacts; variants: ListingTextVariant[];
  sourceAudit: PremiumSourceAudit; sourceContext?: string; images: AutopilotImageCandidate[]; openai: OpenAI;
  imageReview?: BrokerImagePolicy; brokerImageReviewId?: string; bindingImages?: string[];
}) {
  const attempt = await savePremiumAssessment(input.userId, "final", { facts: input.facts, variants: input.variants, sourceAudit: input.sourceAudit, images: input.images, textAudit: { status: "missing", findings: [], snapshotHash: "" }, decision: { ready: false, status: "BLOCKED" } }, input.listingId);
  const textAudit = await auditPremiumTexts(input.openai, input.facts, input.variants, input.sourceContext, input.sourceAudit.sources.some(source => source.kind === "manual_confirmation"));
  const decision = evaluatePremiumQualityGate({ ...input, textAudit, expectedImageCount: input.images.length });
  const payload = { brokerImageReviewId: input.brokerImageReviewId, imageReview: input.imageReview, facts: input.facts, variants: input.variants, sourceAudit: input.sourceAudit,
    textAudit, images: input.images, decision,
    binding: listingQualityBinding(input.facts, input.variants, input.bindingImages ?? (decision.imageSelection?.selectedImageIds ?? []).map(id => input.images.find(image => image.imageId === id)!.contentFingerprint)) };
  const clean = JSON.parse(JSON.stringify(payload));
  const record = await prisma.premiumQualityAssessment.update({ where: { id: attempt.id }, data: { payload: clean, snapshotHash: stableQualityHash(clean) } });
  return { ...decision, assessmentId: record.id, expiresAt: record.expiresAt.toISOString() };
}
export async function premiumImagesFromBytes(files: { name: string; type: string; bytes: Buffer }[]) {
  const analyses = await requestAutopilotImageAnalyses(files.map(file => "data:" + file.type + ";base64," + file.bytes.toString("base64")), files.map((_, index) => String(index + 1)));
  const images: AutopilotImageCandidate[] = [];
  for (let i = 0; i < files.length; i++) images.push({ imageId: String(i + 1), fileName: files[i].name,
    analysis: analyses[i], contentFingerprint: await fingerprintImageContent(files[i].bytes), comparison: await imageComparisonEvidence(files[i].bytes) });
  return images;
}
export async function premiumSources(userId: string, receiptId: unknown, facts: PremiumFacts, manualConfirmed: boolean): Promise<PremiumSourceAudit> {
  const record = await readPremiumAssessment(userId, receiptId, "expose");
  if (receiptId && !record) return { status: "failed", conflicts: [], sources: [] };
  const payload = record?.payload as { extracted?: PremiumFacts; evidence?: ExposeCoreEvidence; rentEvidence?: ExposeCoreEvidence; sourceChecked?: boolean; documents?: PremiumSourceAudit["documents"] } | undefined;
  const sourceFields = ["countryCode", "street", "postalCode", "location", "propertyType", "highlights", "marketingType", "transactionType", "currency", "commercialUse", "rentPeriod", "priceOnRequestConfirmed", "commercialArea", "plotArea"] as const;
  const nonAffirmative = (value: unknown) => value === undefined || value === null || value === false;
  const changedUnconfirmed = !!record && !manualConfirmed && sourceFields.some(key =>
    // Missing/null/false all mean no affirmative price-on-request confirmation.
    // Only this boolean field has that equivalence; true and malformed values
    // never receive it. In particular true -> false must still invalidate review.
    key === "priceOnRequestConfirmed"
      ? !(nonAffirmative(facts[key]) && nonAffirmative(payload?.extracted?.[key])) && facts[key] !== payload?.extracted?.[key]
      : facts[key] !== undefined && facts[key] !== "" && String(facts[key]) !== String(payload?.extracted?.[key] ?? ""));
  const countryUnconfirmed = !!record && (
    ((facts.countryCode !== undefined || payload?.extracted?.countryCode !== undefined) && !["CH", "DE", "AT"].includes(String(facts.countryCode))) ||
    (!manualConfirmed && payload?.extracted?.countryEvidence !== undefined && (payload.extracted.countryEvidence as {status?: unknown})?.status !== "confirmed")
  );
  const parsed = (value: PremiumFacts) => ({ rooms: premiumNumber(value.rooms), livingArea: premiumNumber(value.livingArea), price: premiumNumber(value.price), currency: value.currency });
  const rental = facts.marketingType === "rent";
  const documented = arePremiumCoreFactsDocumented(facts, rental ? payload?.rentEvidence : payload?.evidence);
  const sourceFacts = rental ? { ...payload?.extracted, price: payload?.rentEvidence?.values.price } : payload?.extracted;
  const evidence = collectExposeCoreSourceFacts([], [parsed(sourceFacts ?? {}), parsed(facts)], rental ? "rent" : "sale");
  let conflicts = [...(payload?.evidence?.conflicts ?? []).filter(conflict => !rental || conflict.field !== "price"), ...(rental ? payload?.rentEvidence?.conflicts ?? [] : []), ...evidence.conflicts];
  if (manualConfirmed) {
    // Explicit human confirmation is recorded; a client-side status flag is ignored.
    try {
      const resolved = confirmExposeFactConflicts({ rooms: String(facts.rooms ?? ""), livingArea: String(facts.livingArea ?? ""), price: String(facts.price ?? ""), missingFields: [], factConflicts: conflicts });
      conflicts = resolved.factConflicts ?? [];
      if (conflicts.some(conflict => conflict.candidates.some(candidate => candidate.currency) && !["EUR", "CHF"].includes(String(facts.currency)))) conflicts = conflicts.map(conflict => ({ ...conflict, status: "unresolved" as const }));
    } catch { /* Unresolved values remain blocking. */ }
  }
  const sources = record ? [{ kind: "expose", reference: record.id }] : [];
  if (manualConfirmed) sources.push({ kind: "manual_confirmation", reference: stableQualityHash(facts) });
  return { status: countryUnconfirmed || changedUnconfirmed || (rental && payload?.rentEvidence?.ambiguousPriceUnits) ? "failed" : ((payload?.sourceChecked && documented) || manualConfirmed) && sources.length ? "passed" : "missing", conflicts, sources, ...(payload?.documents ? {documents:payload.documents} : {}) };
}
export async function isListingPremiumQualityReady(userId: string, listingId: string): Promise<boolean> {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, userId, archivedAt: null }, include: { images: true } });
  if (!listing) return false;
  const record = await prisma.premiumQualityAssessment.findFirst({ where: { userId, listingId, kind: "final", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!record || !await readPremiumAssessment(userId, record.id, "final")) return false;
  const payload = record.payload as unknown as { facts: PremiumFacts; variants: ListingTextVariant[]; sourceAudit: PremiumSourceAudit; textAudit: Awaited<ReturnType<typeof auditPremiumTexts>>; images: AutopilotImageCandidate[]; binding: string; brokerImageReviewId?: string; imageReview?: BrokerImagePolicy };
  if (!payload) return false;
  if (payload.brokerImageReviewId) {
    const review = await readPremiumAssessment(userId, payload.brokerImageReviewId, "broker_images");
    if (!review || review.listingId !== listingId) return false;
    const snapshot = await currentBrokerSnapshot(listing);
    if ((review.payload as { snapshot: string }).snapshot !== snapshot.snapshot) return false;
  } else if (payload.imageReview) return false;
  if (!evaluatePremiumQualityGate({ ...payload, expectedImageCount: payload.brokerImageReviewId ? payload.images.length : listing.images.length }).ready) return false;
  let variants: ListingTextVariant[];
  try { variants = JSON.parse(listing.generatedVariants ?? "null"); if (!Array.isArray(variants)) return false; } catch { return false; }
  const orderedImages = [...listing.images].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
  if (!orderedImages[0]?.isPrimary || orderedImages.slice(1).some(image => image.isPrimary)) return false;
  const hashes: string[] = [];
  for (const image of orderedImages) hashes.push(await fingerprintImageContent(Buffer.from(await getObjectBytes(image.storageKey))));
  return payload.binding === listingQualityBinding({ ...payload.facts, ...listing }, variants, hashes);
}
export async function assertListingPremiumQualityReady(userId: string, listingId: string) {
  if (!await isListingPremiumQualityReady(userId, listingId)) throw new Error("PREMIUM_QUALITY_NOT_READY");
}

// Publication adapters do not yet carry rental/request-price intent or the
// commercial area from the assessment. Keep those transfers blocked until
// a separately authorized adapter change can represent them faithfully.
export async function isListingPremiumPublicationReady(userId: string, listingId: string) {
  if (!await isListingBrokerApproved(userId, listingId)) return false;
  const record = await prisma.premiumQualityAssessment.findFirst({ where: { userId, listingId, kind: "final", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  const payload = record?.payload as unknown as { facts?: PremiumFacts } | undefined;
  return payload?.facts?.marketingType === "sale" && premiumPropertyKind(payload.facts.propertyType) !== "commercial";
}
export async function assertListingPremiumPublicationReady(userId: string, listingId: string) {
  if (!await isListingPremiumPublicationReady(userId, listingId)) throw new Error("PREMIUM_PUBLICATION_CONTEXT_UNSUPPORTED");
}

export async function premiumSourceContext(userId: string, receiptId: unknown) {
  const record = await readPremiumAssessment(userId, receiptId, "expose");
  const payload = record?.payload as { sourceText?: unknown } | undefined;
  return typeof payload?.sourceText === "string" ? payload.sourceText : "";
}

export async function currentBrokerSnapshot(listing: { id: string; images: { id: string; fileName: string | null; storageKey: string; analysis: string | null; analysisStatus: string; analyzedAt: Date | null; position: number; isPrimary: boolean; updatedAt: Date }[]; [key: string]: unknown }) {
  const images = [];
  for (const image of listing.images) {
    const bytes = Buffer.from(await getObjectBytes(image.storageKey));
    let fingerprint: string; let decoded = true;
    try { fingerprint = await fingerprintImageContent(bytes); } catch { fingerprint = createHash("sha256").update(bytes).digest("hex"); decoded = false; }
    const comparison=decoded?await imageComparisonEvidence(bytes):undefined;
    images.push({ ...image, decoded, fingerprint, comparison, version: imageReviewVersion(image, fingerprint) });
  }
  return { images, snapshot: brokerSnapshot(listing, images.map(image=>({id:image.id,version:image.version,position:image.position,isPrimary:image.isPrimary,updatedAt:image.updatedAt}))) };
}
export async function isListingBrokerApproved(userId: string, listingId: string) {
  if (!await isListingPremiumQualityReady(userId, listingId)) return false;
  const listing = await prisma.listing.findFirst({ where: { id: listingId, userId, archivedAt: null }, include: { images: true } });
  const approval = await prisma.premiumQualityAssessment.findFirst({ where: { userId, listingId, kind: "broker_approval", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  const final = await prisma.premiumQualityAssessment.findFirst({ where: { userId, listingId, kind: "final", expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!listing || !approval || !final || !await readPremiumAssessment(userId, approval.id, "broker_approval")) return false;
  const payload = approval.payload as { snapshot: string; assessmentId: string; explicitlyConfirmed?: boolean };
  return payload.explicitlyConfirmed === true && payload.assessmentId === final.id && payload.snapshot === (await currentBrokerSnapshot(listing)).snapshot;
}
