import { getSafeImageRoomEvidence, getImageRoomCategoryIssue, IMAGE_FACT_MIN_CONFIDENCE } from "./image-expose-consistency";

export const AUTOPILOT_IMAGE_CATEGORIES = [
  "living", "exterior", "kitchen", "outdoor", "dining", "bedroom", "bathroom",
  "office", "hallway", "storage", "floorplan", "document", "logo", "other",
] as const;
export type AutopilotImageAnalysis = {
  // Optional only for previously stored positional analyses. New model responses require it.
  imageId?: string;
  imageIndex: number;
  room: string | null;
  roomConfidence: number | null;
  roomIndependentFacts: { fact: string; confidence: number }[];
  condition: string;
  visibleFacts: string[];
  category: typeof AUTOPILOT_IMAGE_CATEGORIES[number];
  qualityScore: number;
  titleScore: number;
  sharpnessScore: number;
  exposureScore: number;
  suitable: boolean;
  suitabilityConfidence: number;
  suitabilityReason: string;
};

export function validateRequestedImageIds(imageIds: readonly string[], imageCount: number): void {
  if (imageIds.length !== imageCount || new Set(imageIds).size !== imageCount ||
    imageIds.some(id => typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(id))) {
    throw new Error("AUTOPILOT_IMAGE_REQUEST_ID_INVALID");
  }
}

export function validateAutopilotImageAnalyses(value: unknown, imageCount: number, expectedImageIds?: readonly string[]): AutopilotImageAnalysis[] {
  if (expectedImageIds) validateRequestedImageIds(expectedImageIds, imageCount);
  if (!Array.isArray(value) || value.length !== imageCount) {
    throw new Error("AUTOPILOT_IMAGE_ANALYSIS_INCOMPLETE");
  }
  const indexes = new Set<number>();
  const identities = new Set<string>();
  const hasIds = value.some(item => item && typeof item === "object" && item.imageId !== undefined);
  const scoreKeys = ["qualityScore", "titleScore", "sharpnessScore", "exposureScore"] as const;
  return value.map(item => {
    if (!item || typeof item !== "object" || !Number.isInteger(item.imageIndex) ||
      item.imageIndex < 1 || item.imageIndex > imageCount || indexes.has(item.imageIndex)) {
      throw new Error("AUTOPILOT_IMAGE_ANALYSIS_INDEX_INVALID");
    }
    indexes.add(item.imageIndex);
    if (expectedImageIds || hasIds) {
      if (typeof item.imageId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(item.imageId) || identities.has(item.imageId)) {
        throw new Error("AUTOPILOT_IMAGE_ANALYSIS_ID_INVALID");
      }
      identities.add(item.imageId);
      if (expectedImageIds) {
        const expectedIndex = expectedImageIds.indexOf(item.imageId);
        if (expectedIndex < 0) throw new Error("AUTOPILOT_IMAGE_ANALYSIS_ID_UNKNOWN");
        // The model may reorder the array, but may not renumber image identities.
        if (item.imageIndex !== expectedIndex + 1) throw new Error("AUTOPILOT_IMAGE_ANALYSIS_ID_INDEX_MISMATCH");
      }
    }
    if (scoreKeys.some(key => !Number.isInteger(item[key]) || item[key] < 0 || item[key] > 100) ||
      typeof item.suitable !== "boolean" || typeof item.suitabilityConfidence !== "number" ||
      !Number.isFinite(item.suitabilityConfidence) || item.suitabilityConfidence < 0 || item.suitabilityConfidence > 1 ||
      !AUTOPILOT_IMAGE_CATEGORIES.includes(item.category) || typeof item.suitabilityReason !== "string" ||
      !item.suitabilityReason.trim() || item.suitabilityReason.length > 500 ||
      typeof item.condition !== "string" || typeof item.room !== "string" ||
      typeof item.roomConfidence !== "number" || !Number.isFinite(item.roomConfidence) ||
      item.roomConfidence < 0 || item.roomConfidence > 1 ||
      !Array.isArray(item.visibleFacts) || !item.visibleFacts.every((fact: unknown) => typeof fact === "string") ||
      !Array.isArray(item.roomIndependentFacts)) {
      throw new Error("AUTOPILOT_IMAGE_ANALYSIS_INVALID");
    }
    // Existing vocabulary and .9 confidence guard remain the sole source of room facts.
    return { ...item, ...getSafeImageRoomEvidence(item) } as AutopilotImageAnalysis;
  }).sort((a, b) => a.imageIndex - b.imageIndex);
}

export type AutopilotImageCandidate = {
  imageId: string;
  fileName: string | null;
  contentFingerprint: string;
  analysis: AutopilotImageAnalysis;
  comparison?: { width: number; height: number; samples: string };
};
function comparisonPixels(candidate:AutopilotImageCandidate):number[]|null {
  const c=candidate.comparison;if(!c)return null;
  if(!Number.isInteger(c.width)||!Number.isInteger(c.height)||c.width<1||c.height<1||!(/^[a-f0-9]{6144}$/).test(c.samples))throw Error('AUTOPILOT_IMAGE_COMPARISON_INVALID');
  return c.samples.match(/../g)!.map(x=>parseInt(x,16));
}
function sameCompressionFrame(a:number[],b:number[]) {
  // No contrast normalization: darkness, crops and different views are not duplicates.
  let sum=0,max=0,texture=0;
  for(let channel=0;channel<3;channel++){let lo=255,hi=0;for(let i=channel;i<a.length;i+=3){lo=Math.min(lo,a[i]);hi=Math.max(hi,a[i]);}texture=Math.max(texture,hi-lo);}
  if(texture<24)return false;
  for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);sum+=d;max=Math.max(max,d);}
  return sum/a.length<=2 && max<=24;
}
function rotateSamples(a:number[]) {const b=new Array<number>(a.length);for(let y=0;y<32;y++)for(let x=0;x<32;x++)for(let c=0;c<3;c++)b[(x*32+31-y)*3+c]=a[(y*32+x)*3+c];return b;}
export function selectAutopilotImages(candidates: AutopilotImageCandidate[], review?: { confirmedImageIds: string[]; order: string[]; primaryImageId: string }) {
  const identities = new Set<string>();
  const fingerprints = new Map<string, string>();
  const pixels=candidates.map(comparisonPixels),rotated=new Set<string>();
  for(let i=0;i<candidates.length;i++)for(let j=0;j<i;j++){
    const a=candidates[i].comparison,b=candidates[j].comparison;
    if(a&&b&&a.width===b.height&&a.height===b.width&&pixels[i]&&pixels[j]&&
      (sameCompressionFrame(pixels[i]!,rotateSamples(pixels[j]!))||sameCompressionFrame(rotateSamples(pixels[i]!),pixels[j]!))){rotated.add(candidates[i].imageId);rotated.add(candidates[j].imageId);}
  }
  const entries = candidates.map((candidate, index) => {
    if (!candidate.imageId || identities.has(candidate.imageId) || !/^[a-f0-9]{64}$/.test(candidate.contentFingerprint)) {
      throw new Error("AUTOPILOT_IMAGE_IDENTITY_INVALID");
    }
    identities.add(candidate.imageId);
    const a = candidate.analysis;
    if (a.imageId !== undefined && a.imageId !== candidate.imageId) {
      throw new Error("AUTOPILOT_IMAGE_ANALYSIS_ID_MISMATCH");
    }
    const duplicateOf = fingerprints.get(candidate.contentFingerprint) ?? candidates.slice(0,index).find((other,j)=>candidate.comparison && other.comparison &&
      candidate.comparison.width===other.comparison.width && candidate.comparison.height===other.comparison.height && pixels[index]&&pixels[j]&&sameCompressionFrame(pixels[index]!,pixels[j]!))?.imageId ?? null;
    const reasons: string[] = [];
    const roomCategoryIssue = getImageRoomCategoryIssue(a);
    if (roomCategoryIssue) reasons.push(roomCategoryIssue);
    if (duplicateOf) reasons.push("DUPLICATE_CONTENT");
    else fingerprints.set(candidate.contentFingerprint, candidate.imageId);
    if (!a.suitable || ["floorplan", "document", "logo"].includes(a.category)) reasons.push("UNSUITABLE_IMAGE");
    if (a.suitabilityConfidence < IMAGE_FACT_MIN_CONFIDENCE) reasons.push("SUITABILITY_UNCERTAIN");
    if ((!a.room && !["exterior","outdoor"].includes(a.category)) || a.category === "other") reasons.push("ROOM_OR_CATEGORY_UNCONFIRMED");
    if(rotated.has(candidate.imageId))reasons.push('ORIENTATION_REVIEW_REQUIRED');
    // A small decoded exterior frame cannot substantiate whole-building context.
    // This is a review policy, not a claim that the model label is corrected.
    if (["exterior","outdoor"].includes(a.category) && candidate.comparison &&
      Math.min(candidate.comparison.width,candidate.comparison.height) < 256) reasons.push("SCENE_CONTEXT_REVIEW_REQUIRED");
    // Conservative product policy, not empirically calibrated model accuracy.
    if (a.qualityScore < 60) reasons.push("QUALITY_REVIEW_REQUIRED");
    if (a.sharpnessScore < 50) reasons.push("SHARPNESS_REVIEW_REQUIRED");
    if (a.exposureScore < 50) reasons.push("EXPOSURE_REVIEW_REQUIRED");
    const reviewedReasons = review?.confirmedImageIds.includes(candidate.imageId) ? reasons.filter(reason => ["SUITABILITY_UNCERTAIN", "ROOM_OR_CATEGORY_UNCONFIRMED", "QUALITY_REVIEW_REQUIRED", "SHARPNESS_REVIEW_REQUIRED", "EXPOSURE_REVIEW_REQUIRED", "ORIENTATION_REVIEW_REQUIRED", "SCENE_CONTEXT_REVIEW_REQUIRED"].includes(reason)) : [];
    return { ...candidate, originalIndex: index, duplicateOf, reasons: reasons.filter(reason=>!reviewedReasons.includes(reason)), reviewedReasons, selected: reasons.length === reviewedReasons.length };
  });
  const roomPriority = (entry: typeof entries[number]) => {
    const room = entry.analysis.room;
    if (room === "Wohnzimmer") return 100;
    if (entry.analysis.category === 'exterior') return 95;
    if (room === "Außenansicht" || room === "Aussenansicht" || room === "Aussenbereich") return 95;
    if (room === "Küche") return 90;
    if (["Garten", "Terrasse", "Balkon"].includes(room ?? "")) return 85;
    if (room === "Esszimmer") return 80;
    if (room === "Schlafzimmer") return 75;
    if (room === "Badezimmer") return 65;
    return 50;
  };
  const selected = entries.filter(entry => entry.selected);
  const heroes = [...selected].filter(entry => entry.analysis.titleScore >= 60).sort((a, b) =>
    b.analysis.titleScore - a.analysis.titleScore || b.analysis.qualityScore - a.analysis.qualityScore ||
    roomPriority(b) - roomPriority(a) || a.originalIndex - b.originalIndex);
  const hero = review ? selected.find(entry=>entry.imageId===review.primaryImageId && review.confirmedImageIds.includes(entry.imageId)) ?? null : heroes[0] ?? null;
  const ordered = [...(hero ? [hero] : []), ...selected.filter(entry => entry !== hero).sort((a, b) =>
    roomPriority(b) - roomPriority(a) || b.analysis.qualityScore - a.analysis.qualityScore || a.originalIndex - b.originalIndex)];
  const reasons = candidates.length && !hero ? ["NO_CONFIRMED_HERO_IMAGE"] : [];
  return {
    entries,
    selectedImageIds: (review ? [...ordered].sort((a,b)=>review.order.indexOf(a.imageId)-review.order.indexOf(b.imageId)) : ordered).map(entry => entry.imageId),
    primaryImageId: hero?.imageId ?? null,
    requiresReview: entries.some(entry => !entry.selected) || reasons.length > 0,
    reasons,
  };
}

export const REVIEW_LABELS: Record<string, string> = {
  ROOM_CATEGORY_CONFLICT: "Raumlabel und Bildkategorie widersprechen sich",
  ROOM_CATEGORY_UNCONFIRMED: "Bildkategorie nicht bestätigt",
  DUPLICATE_CONTENT: "identischer Bildinhalt",
  UNSUITABLE_IMAGE: "für die automatische Immobiliengalerie ungeeignet",
  SUITABILITY_UNCERTAIN: "Eignung unsicher",
  ROOM_OR_CATEGORY_UNCONFIRMED: "Raum oder Motiv nicht sicher bestätigt",
  QUALITY_REVIEW_REQUIRED: "Bildqualität prüfen",
  SHARPNESS_REVIEW_REQUIRED: "Schärfe prüfen",
  EXPOSURE_REVIEW_REQUIRED: "Belichtung prüfen",
  ORIENTATION_REVIEW_REQUIRED: "Gedrehte Ansicht desselben Motivs erkannt; Ausrichtung beider Bilder ausdrücklich prüfen",
  SCENE_CONTEXT_REVIEW_REQUIRED: "Aussenmotiv zu niedrig aufgelöst; Detailausschnitt, Motiv und Objektbezug ausdrücklich prüfen",
  NO_CONFIRMED_HERO_IMAGE: "kein ausreichend bestätigtes Titelbild",
};
export function describeAutopilotImageReview(selection: ReturnType<typeof selectAutopilotImages>): string {
  const details = selection.entries.filter(entry => !entry.selected).map(entry =>
    (entry.fileName || entry.imageId) + ": " + entry.reasons.map(reason => REVIEW_LABELS[reason]).join(", "));
  details.push(...selection.reasons.map(reason => REVIEW_LABELS[reason]));
  return "Bitte Bildauswahl manuell prüfen. " + details.join("; ") +
    ". Originalbilder bleiben im Objekt erhalten. Keine automatische Freigabe.";
}
