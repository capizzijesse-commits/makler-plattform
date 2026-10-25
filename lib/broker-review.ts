import { stableQualityHash, PREMIUM_QUALITY_VERSION } from "./premium-quality-gate.server";
export const REVIEWABLE_IMAGE_REASONS = ["SUITABILITY_UNCERTAIN", "ROOM_OR_CATEGORY_UNCONFIRMED", "QUALITY_REVIEW_REQUIRED", "SHARPNESS_REVIEW_REQUIRED", "EXPOSURE_REVIEW_REQUIRED", "ORIENTATION_REVIEW_REQUIRED", "SCENE_CONTEXT_REVIEW_REQUIRED"];
export type BrokerImageDecision = { imageId: string; decision: "accept" | "reject"; note: string; version: string };
function json(value: unknown) { if (Object.prototype.toString.call(value) === "[object Date]") return (value as Date).toISOString(); if (typeof value !== "string") return value ?? null; try { return JSON.parse(value); } catch { return value; } }
export function publicationContent(facts: Record<string, unknown>) {
  const keys = ["market", "countryCode", "locale", "projectName", "street", "postalCode", "location", "propertyType", "rooms", "livingArea", "plotArea", "price", "highlights", "style", "latitude", "longitude", "currency", "marketingType", "transactionType", "rentPeriod", "priceOnRequestConfirmed", "commercialArea", "commercialUse"];
  return { ...Object.fromEntries(keys.map(key => [key, facts[key] ?? null])), countryCode: facts.countryCode ?? facts.market ?? null, locationDescription: facts.locationDescription ?? null, locationData: json(facts.locationData), socialVariants: json(facts.socialVariants) };
}
export function imageReviewVersion(image: { id: string; storageKey: string; analysis: string | null; analysisStatus: string; analyzedAt: unknown }, fingerprint: string) {
  return stableQualityHash({ qualityVersion: PREMIUM_QUALITY_VERSION, id: image.id, storageKey: image.storageKey, analysis: image.analysis, status: image.analysisStatus, analyzedAt: json(image.analyzedAt), fingerprint });
}
export function brokerSnapshot(listing: Record<string, unknown>, images: { id: string; version: string; position: number; isPrimary: boolean; updatedAt?: unknown }[]) {
  return stableQualityHash({ content: publicationContent(listing), variants: json(listing.generatedVariants), revision: json(listing.updatedAt), images: [...images].sort((a,b) => a.position-b.position || a.id.localeCompare(b.id)).map(image=>({...image,updatedAt:json(image.updatedAt)})) });
}
export function validateBrokerDecisions(images: { id: string; version: string; reasons: string[]; analyzed: boolean; titleScore?: number }[], decisions: BrokerImageDecision[], order: string[], primary: string) {
  if (!Array.isArray(decisions) || decisions.length !== images.length || new Set(decisions.map(x=>x.imageId)).size !== images.length || !Array.isArray(order) || order.length !== images.length || new Set(order).size !== images.length || order.some(id=>!images.some(x=>x.id===id))) throw Error("IMAGE_REVIEW_INCOMPLETE");
  for (const image of images) {
    const decision = decisions.find(x=>x.imageId===image.id);
    if (!decision || decision.version !== image.version || !["accept","reject"].includes(decision.decision) || typeof decision.note !== "string" || decision.note.length > 1000) throw Error("IMAGE_REVIEW_STALE");
    if (decision.decision === "accept" && (!image.analyzed || image.reasons.some(reason=>!REVIEWABLE_IMAGE_REASONS.includes(reason)) || (image.reasons.length && !decision.note.trim()))) throw Error("IMAGE_REVIEW_NOT_CONFIRMABLE");
  }
  const accepted = order.filter(id=>decisions.find(x=>x.imageId===id)?.decision === "accept");
  if (!accepted.length || primary !== accepted[0]) throw Error("CONFIRMED_PRIMARY_REQUIRED");
  const title = images.find(image=>image.id===primary);
  if (title?.titleScore !== undefined && title.titleScore < 60 && !decisions.find(x=>x.imageId===primary)?.note.trim()) throw Error("TITLE_REVIEW_NOTE_REQUIRED");
  return accepted;
}
export type BrokerImagePolicy = { confirmedImageIds: string[]; order: string[]; primaryImageId: string };
