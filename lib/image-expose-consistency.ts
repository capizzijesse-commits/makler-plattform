import { HOME_STAGING_ROOM_TYPES } from "./home-staging-quality";
import { roomTypeLabel } from "./home-staging-analysis-cache";

/**
 * IMAGE_EXPOSE_CONSISTENCY_T204A
 *
 * Deterministic consistency check.
 * Only structured, sufficiently reliable evidence is compared.
 * No inference from filenames or free-form marketing text.
 */

export type RoofShape = "flat" | "pitched" | "unknown";

export type RoofEvidence = {
  shape: RoofShape;
  confidence: number;
};

export type ImageRoofEvidence = RoofEvidence & {
  fileName: string;
};

export type ConsistencyIssue = {
  code: "ROOF_SHAPE_CONFLICT" | "IMAGE_ROOF_CONFLICT";
  severity: "review";
  message: string;
  affectedImages: string[];
};

export type ConsistencyResult = {
  requiresConfirmation: boolean;
  issues: ConsistencyIssue[];
};

function reliable(
  evidence: RoofEvidence | undefined
): evidence is RoofEvidence {
  return (
    evidence !== undefined &&
    (evidence.shape === "flat" ||
      evidence.shape === "pitched") &&
    Number.isFinite(evidence.confidence) &&
    evidence.confidence >= IMAGE_FACT_MIN_CONFIDENCE &&
    evidence.confidence <= 1
  );
}

function roofLabel(shape: RoofShape): string {
  return shape === "flat"
    ? "Flachdach"
    : shape === "pitched"
      ? "geneigtes Dach"
      : "unbekannte Dachform";
}

export function checkImageExposeConsistency(input: {
  exposeRoof?: RoofEvidence;
  imageRoofs: ImageRoofEvidence[];
}): ConsistencyResult {
  const issues: ConsistencyIssue[] = [];

  const reliableImages = input.imageRoofs.filter(reliable);
  const flat = reliableImages.filter(
    (image) => image.shape === "flat"
  );
  const pitched = reliableImages.filter(
    (image) => image.shape === "pitched"
  );

  // Contradictory photographs can also indicate mixed properties.
  if (flat.length > 0 && pitched.length > 0) {
    issues.push({
      code: "IMAGE_ROOF_CONFLICT",
      severity: "review",
      message:
        "Die Fotos zeigen unterschiedliche Dachformen. " +
        "Bitte prüfen, ob sämtliche Bilder zum selben Objekt gehören.",
      affectedImages: reliableImages.map(
        (image) => image.fileName
      ),
    });
  }

  if (reliable(input.exposeRoof)) {
    const conflicts = reliableImages.filter(
      (image) => image.shape !== input.exposeRoof!.shape
    );

    if (conflicts.length > 0) {
      issues.push({
        code: "ROOF_SHAPE_CONFLICT",
        severity: "review",
        message:
          "Widerspruch zwischen Exposé (" +
          roofLabel(input.exposeRoof.shape) +
          ") und Fotos (" +
          roofLabel(conflicts[0].shape) +
          "). Bitte Objektzugehörigkeit prüfen.",
        affectedImages: conflicts.map(
          (image) => image.fileName
        ),
      });
    }
  }

  return {
    requiresConfirmation: issues.length > 0,
    issues,
  };
}
// Same evidence policy as the existing roof consistency guard; not a
// statistically calibrated accuracy claim for a model's self-assessment.
export const IMAGE_FACT_MIN_CONFIDENCE = 0.9;
export const ROOM_INDEPENDENT_VISIBLE_FACTS = [
  "Fenster", "Große Fenster", "Tageslicht", "Helle Wände", "Weiße Wände",
  "Holzboden", "Parkettboden", "Fliesenboden", "Sichtbare Holzbalken",
] as const;
// Missing categories remain compatible with legacy room evidence. Explicitly
// uncertain or conflicting categories cannot authorize room or feature facts.
export function getImageRoomCategoryIssue(input: unknown): "ROOM_CATEGORY_CONFLICT" | "ROOM_CATEGORY_UNCONFIRMED" | null {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (raw.roomCategoryIssue === "ROOM_CATEGORY_CONFLICT" || raw.roomCategoryIssue === "ROOM_CATEGORY_UNCONFIRMED") return raw.roomCategoryIssue;
  if (raw.category === undefined) return null;
  const categories: Record<string, string> = {
    livingRoom: "living", bedroom: "bedroom", office: "office", diningRoom: "dining",
    kidsRoom: "bedroom", storageRoom: "storage", kitchen: "kitchen", bathroom: "bathroom",
    hallway: "hallway", balcony: "outdoor", terrace: "outdoor", garden: "outdoor", exterior: "exterior",
  };
  const name = normalizeImageRoomName(raw.room);
  const roomType = HOME_STAGING_ROOM_TYPES.find(type => type in categories &&
    (type.toLowerCase() === name || roomTypeLabel(type).toLocaleLowerCase("de") === name));
  if (typeof raw.category !== "string" || !Object.values(categories).includes(raw.category)) {
    return ["floorplan", "document", "logo"].includes(String(raw.category)) && roomType
      ? "ROOM_CATEGORY_CONFLICT" : "ROOM_CATEGORY_UNCONFIRMED";
  }
  return roomType && categories[roomType] !== raw.category ? "ROOM_CATEGORY_CONFLICT" : null;
}
export type SafeImageRoomEvidence = {
  roomCategoryIssue?: "ROOM_CATEGORY_CONFLICT" | "ROOM_CATEGORY_UNCONFIRMED";
  room: string | null;
  roomConfidence: number | null;
  roomIndependentFacts: { fact: string; confidence: number }[];
};
// The vision category spelling is also a valid room alias. Keep the same
// confidence and category-conflict checks as for livingRoom/Wohnzimmer.
function normalizeImageRoomName(value: unknown): string {
  const name = typeof value === "string" ? value.trim().toLocaleLowerCase("de") : "";
  return name === "living" ? "livingroom" : name;
}
export function getSafeImageRoomEvidence(input: unknown): SafeImageRoomEvidence {
  const raw = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const roomCategoryIssue = getImageRoomCategoryIssue(raw);
  const confidence = typeof raw.roomConfidence === "number" && Number.isFinite(raw.roomConfidence) &&
    raw.roomConfidence >= 0 && raw.roomConfidence <= 1 ? raw.roomConfidence : null;
  const name = normalizeImageRoomName(raw.room);
  const knownType = HOME_STAGING_ROOM_TYPES.find(type => type !== "other" && type !== "unclear" &&
    (type.toLowerCase() === name || roomTypeLabel(type).toLocaleLowerCase("de") === name));
  const room = !roomCategoryIssue && knownType && confidence !== null && confidence >= IMAGE_FACT_MIN_CONFIDENCE ? roomTypeLabel(knownType) : null;
  const facts: SafeImageRoomEvidence["roomIndependentFacts"] = [];
  for (const entry of Array.isArray(raw.roomIndependentFacts) ? raw.roomIndependentFacts.slice(0, 20) : []) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.fact !== "string" || typeof item.confidence !== "number" || !Number.isFinite(item.confidence) ||
        item.confidence < IMAGE_FACT_MIN_CONFIDENCE || item.confidence > 1) continue;
    // Only explicit, independently rated neutral observations; never infer room
    // usage from furniture, filenames, condition, strengths or free-form text.
    const fact = ROOM_INDEPENDENT_VISIBLE_FACTS.find(f => f.toLocaleLowerCase("de") === item.fact!.toString().trim().toLocaleLowerCase("de"));
    if (fact && !facts.some(x => x.fact === fact)) facts.push({ fact, confidence: item.confidence });
  }
  return { room, roomConfidence: confidence, roomIndependentFacts: roomCategoryIssue ? [] : facts,
    ...(roomCategoryIssue ? { roomCategoryIssue } : {}) };
}
export function buildSafeImageRoomPrompt(input: unknown): string {
  if (!Array.isArray(input)) return "";
  const evidence = input.slice(0, 100);
  const identities = new Map<number, string | null>();
  const contradictions = new Set<number>();
  for (const item of evidence) {
    if (!item || !Number.isInteger(item.imageIndex)) continue;
    const room = getSafeImageRoomEvidence(item).room;
    if (identities.has(item.imageIndex) && identities.get(item.imageIndex) !== room) contradictions.add(item.imageIndex);
    identities.set(item.imageIndex, room);
  }
  return evidence.map((item, index) => {
    const safe = getSafeImageRoomEvidence(item);
    if (item && contradictions.has(item.imageIndex)) safe.room = null;
    const parts: string[] = [];
    if (safe.room) parts.push("Bestätigte Bildklassifikation: " + safe.room);
    if (safe.roomIndependentFacts.length) parts.push("Unabhängig sichtbare Merkmale: " + safe.roomIndependentFacts.map(x => x.fact).join(", "));
    if (!parts.length) return "";
    if (!safe.room) parts.push("Keine Raumnutzung belegt; aus allgemeinen Merkmalen keine Raumnutzung ableiten.");
    return "Bild " + (index + 1) + ":\n" + parts.join("\n");
  }).filter(Boolean).join("\n\n");
}
