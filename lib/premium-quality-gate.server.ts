import { evaluatePremiumEditorialQuality } from './premium-editorial-quality';
import { findStrictQualityIssues } from "./listing-strict-quality";
import { createHash } from "node:crypto";
import { evaluateListingQuality, type ListingTextVariant, type ListingTextLocale } from "./listing-text-quality";
import { findUnsupportedPropertyFeatures } from "./listing-text-feature-gate";
import { findRoomCountContradictions } from "./listing-room-count-guard";
import { normalizeExposeNumber, type ExposeFactConflict } from "./expose-core-fact-conflicts";
import { selectAutopilotImages, validateAutopilotImageAnalyses, type AutopilotImageCandidate } from "./autopilot-image-quality";

export const PREMIUM_QUALITY_VERSION = "PREMIUM_FACT_EDITORIAL_GATE_8Z";
export type PremiumFacts = {
  [key: string]: unknown;
  market?: unknown; locale?: unknown; location?: unknown; postalCode?: unknown; street?: unknown;
  propertyType?: unknown; rooms?: unknown; livingArea?: unknown; price?: unknown; currency?: unknown;
  plotArea?: unknown; commercialArea?: unknown; commercialUse?: unknown;
  marketingType?: unknown; transactionType?: unknown; rentPeriod?: unknown; priceOnRequestConfirmed?: unknown;
  highlights?: unknown; verifiedFeatures?: unknown;
};
export type PremiumSourceAudit = {
  status: "passed" | "failed" | "missing";
  conflicts: ExposeFactConflict[];
  sources: { kind: string; reference: string }[];
  documents?: { reference:string; analysis:unknown }[];
};
export type PremiumTextAudit = { status: "passed" | "failed" | "missing"; findings: unknown[]; snapshotHash: string };
export function stableQualityHash(value: unknown): string {
  function sort(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(sort);
    if (input && typeof input === "object") return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, sort(v)]));
    return input;
  }
  return createHash("sha256").update(JSON.stringify(sort(value))).digest("hex");
}
export function premiumNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value !== "string") return null;
  const normalized = normalizeExposeNumber(value.trim().replace(/\s*(?:m²|m2|qm)$/iu, ""));
  return normalized ? Number(normalized) : null;
}
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
export function premiumPropertyKind(value: unknown) {
  const name = text(value).toLocaleLowerCase("de").replace(/[ -]/g, "");
  if (["wohnung", "eigentumswohnung", "apartment", "flat", "penthouse", "maisonette", "attikawohnung"].includes(name)) return "residential";
  if (["haus", "wohnhaus", "zweifamilienhaus", "doppelhaus", "einfamilienhaus", "mehrfamilienhaus", "reihenhaus", "doppelhaushälfte", "doppelhaushaelfte", "villa", "house", "singlefamilyhouse"].includes(name)) return "residential";
  if (["grundstück", "grundstueck", "bauland", "land", "plot"].includes(name)) return "land";
  if (["gewerbeobjekt", "gewerbefläche", "gewerbeflaeche", "gewerbe", "büro", "buero", "bürofläche", "laden", "lager", "halle", "commercial"].includes(name)) return "commercial";
  return null;
}
export function premiumTextSnapshot(facts: PremiumFacts, variants: ListingTextVariant[]) {
  return stableQualityHash({ facts, variants });
}
export function evaluatePremiumTextQuality(facts: PremiumFacts, variants: ListingTextVariant[], audit?: PremiumTextAudit | null) {
  const issues: string[] = [];
  const locale = ["de", "it", "fr", "en"].includes(String(facts.locale)) ? facts.locale as ListingTextLocale : "de";
  if (variants.some(variant => findStrictQualityIssues(variant).length > 0)) issues.push("STRICT_FORMAT_QUALITY_FAILED");
  const quality = evaluateListingQuality(variants, locale, { ...facts });
  if (!quality.passed) issues.push("TEXT_QUALITY_FAILED");
  if (findRoomCountContradictions(String(facts.rooms ?? ""), variants).length) issues.push("ROOM_COUNT_CONTRADICTION");
  if (findUnsupportedPropertyFeatures(facts, variants).length) issues.push("UNSUPPORTED_PROPERTY_FEATURE");
  if (!audit || audit.status !== "passed" || !Array.isArray(audit.findings) || audit.findings.length || audit.snapshotHash !== premiumTextSnapshot(facts, variants)) issues.push("FACT_AUDIT_NOT_PASSED");
  const editorial = facts.locale === 'de' ? evaluatePremiumEditorialQuality(facts, variants) : { passed: true, findings: [] };
  if (!editorial.passed) issues.push('PREMIUM_EDITORIAL_QUALITY_FAILED');
  return { passed: issues.length === 0, issues, quality, editorial };
}
export function evaluatePremiumQualityGate(input: {
  facts: PremiumFacts; variants: ListingTextVariant[]; sourceAudit?: PremiumSourceAudit | null;
  imageReview?: { confirmedImageIds: string[]; order: string[]; primaryImageId: string };
  textAudit?: PremiumTextAudit | null; images?: AutopilotImageCandidate[] | null; expectedImageCount?: number;
}) {
  const reasons: string[] = [];
  const facts = input.facts;
  const kind = premiumPropertyKind(facts.propertyType);
  if (!kind) reasons.push("PROPERTY_TYPE_UNSUPPORTED");
  if (!["de", "it", "fr", "en"].includes(text(facts.locale))) reasons.push("LANGUAGE_UNVERIFIED");
  if (facts.market === "DE" && facts.locale !== "de") reasons.push("LANGUAGE_MARKET_UNSUPPORTED");
  const location = text(facts.location);
  if (!location || location.length > 100 || !/\p{L}/u.test(location) || /^(?:unknown|unbekannt|keine angaben|nicht angegeben|ort|n\/a)$/iu.test(location) || /[!?;\n]/u.test(location)) reasons.push("LOCATION_INVALID");
  if (!["CH", "DE"].includes(text(facts.market))) reasons.push("MARKET_UNSUPPORTED");
  if (kind === "residential") {
    const rooms = premiumNumber(facts.rooms);
    if (!rooms || rooms > 30) reasons.push("ROOMS_REQUIRED");
    if (!premiumNumber(facts.livingArea)) reasons.push("LIVING_AREA_REQUIRED");
  }
  if (kind === "land" && !premiumNumber(facts.plotArea)) reasons.push("PLOT_AREA_REQUIRED");
  if (kind === "commercial") {
    if (!premiumNumber(facts.commercialArea)) reasons.push("COMMERCIAL_AREA_REQUIRED");
    if (text(facts.commercialUse).length < 3 || /^(?:unknown|unbekannt|gewerbe|keine angaben|nicht angegeben|n\/a|offen|auf anfrage)$/iu.test(text(facts.commercialUse))) reasons.push("COMMERCIAL_USE_REQUIRED");
  }
  const marketing = text(facts.marketingType);
  if (!["sale", "rent", "on_request"].includes(marketing)) reasons.push("MARKETING_TYPE_UNVERIFIED");
  if (["sale", "rent"].includes(marketing)) {
    if (!premiumNumber(facts.price)) reasons.push("OFFER_AMOUNT_REQUIRED");
    else if (!Number.isSafeInteger(premiumNumber(facts.price))) reasons.push("OFFER_AMOUNT_PRECISION_UNSUPPORTED");
    if (!["EUR", "CHF"].includes(text(facts.currency))) reasons.push("CURRENCY_REQUIRED");
  }
  if (marketing === "rent" && !["month", "year"].includes(text(facts.rentPeriod))) reasons.push("RENT_PERIOD_REQUIRED");
  if (marketing === "on_request" && !["sale", "rent"].includes(text(facts.transactionType))) reasons.push("TRANSACTION_TYPE_REQUIRED");
  if (marketing === "on_request" && facts.price !== null && facts.price !== undefined && String(facts.price).trim() !== "") reasons.push("PRICE_MODE_CONFLICT");
  if (marketing === "on_request" && facts.priceOnRequestConfirmed !== true) reasons.push("PRICE_ON_REQUEST_UNVERIFIED");
  if (!input.sourceAudit || input.sourceAudit.status !== "passed" || !Array.isArray(input.sourceAudit.conflicts) || !Array.isArray(input.sourceAudit.sources) || (!input.sourceAudit.sources.length || input.sourceAudit.sources.some(source => !source || typeof source.reference !== "string" || !source.reference.trim() || !["expose", "manual_confirmation", "listing"].includes(source.kind)))) reasons.push("SOURCE_AUDIT_NOT_PASSED");
  if (input.sourceAudit?.conflicts.some(conflict => conflict.status !== "manually_resolved")) reasons.push("UNRESOLVED_CORE_FACT_CONFLICT");
  const textQuality = evaluatePremiumTextQuality(facts, input.variants, input.textAudit);
  reasons.push(...textQuality.issues);
  let imageSelection: ReturnType<typeof selectAutopilotImages> | null = null;
  if (!input.images || !Number.isInteger(input.expectedImageCount) || input.expectedImageCount! < 1 || input.images.length !== input.expectedImageCount) reasons.push("IMAGE_AUDIT_INCOMPLETE");
  else {
    try {
      validateAutopilotImageAnalyses(input.images.map(image => ({ ...image.analysis, room: image.analysis.room ?? "" })), input.expectedImageCount!,
        input.images.some(image => image.analysis.imageId !== undefined) ? input.images.map(image => image.imageId) : undefined);
      imageSelection = selectAutopilotImages(input.images, input.imageReview);
      if (imageSelection.requiresReview || imageSelection.selectedImageIds.length !== input.expectedImageCount) reasons.push("IMAGE_REVIEW_REQUIRED");
    } catch { reasons.push("IMAGE_AUDIT_INVALID"); }
  }
  const blocking = reasons.some(reason => ["PROPERTY_TYPE_UNSUPPORTED", "MARKET_UNSUPPORTED", "UNRESOLVED_CORE_FACT_CONFLICT", "UNSUPPORTED_PROPERTY_FEATURE", "ROOM_COUNT_CONTRADICTION"].includes(reason));
  return { version: PREMIUM_QUALITY_VERSION, status: reasons.length ? (blocking ? "BLOCKED" : "REVIEW_REQUIRED") : "READY", ready: reasons.length === 0, reasons: [...new Set(reasons)], textQuality, imageSelection } as const;
}

const PREMIUM_REASON_LABELS: Record<string, string> = {
  PROPERTY_TYPE_UNSUPPORTED: "Diese Objektart ist noch nicht ausreichend abgesichert.",
  LOCATION_INVALID: "Bitte einen gültigen Objektort bestätigen.", MARKET_UNSUPPORTED: "Der Zielmarkt ist nicht bestätigt.",
  LANGUAGE_UNVERIFIED: "Die Zielsprache ist nicht bestätigt.", LANGUAGE_MARKET_UNSUPPORTED: "Für den deutschen Markt ist die deutsche Sprachprüfung erforderlich.",
  ROOMS_REQUIRED: "Für diese Wohnimmobilie fehlt eine gültige Zimmerzahl.", LIVING_AREA_REQUIRED: "Für diese Wohnimmobilie fehlt die Wohnfläche.",
  PLOT_AREA_REQUIRED: "Für das Grundstück fehlt eine bestätigte Grundstücksfläche.",
  COMMERCIAL_AREA_REQUIRED: "Für das Gewerbeobjekt fehlt die bestätigte gewerbliche Fläche.", COMMERCIAL_USE_REQUIRED: "Bitte die zulässige oder belegte gewerbliche Nutzung bestätigen.",
  MARKETING_TYPE_UNVERIFIED: "Bitte Kauf, Miete oder Preis auf Anfrage ausdrücklich bestätigen.",
  OFFER_AMOUNT_REQUIRED: "Für Kauf oder Miete fehlt ein gültiger Angebotsbetrag.", OFFER_AMOUNT_PRECISION_UNSUPPORTED: "Dieser Betrag kann im vorhandenen Datenmodell nicht ohne Rundung gespeichert werden.",
  CURRENCY_REQUIRED: "Die Währung des Angebots ist nicht bestätigt.", RENT_PERIOD_REQUIRED: "Bitte den Zeitraum der angegebenen Miete bestätigen.",
  TRANSACTION_TYPE_REQUIRED: "Bitte auch bei Preis auf Anfrage bestätigen, ob Kauf oder Miete angeboten wird.",
  PRICE_MODE_CONFLICT: "Preis auf Anfrage und ein öffentlicher Zahlenpreis widersprechen sich. Bitte die Preisangabe klären.",
  PRICE_ON_REQUEST_UNVERIFIED: "Preis auf Anfrage muss ausdrücklich bestätigt werden.", SOURCE_AUDIT_NOT_PASSED: "Die Quellenprüfung ist unvollständig oder widersprüchlich. Bitte Originalunterlagen und Angaben prüfen.",
  UNRESOLVED_CORE_FACT_CONFLICT: "Widersprüchliche Kernangaben müssen zuerst anhand der Originalunterlagen geklärt werden.",
  PREMIUM_EDITORIAL_QUALITY_FAILED: "Kernangaben, Belege oder redaktionelle Eigenständigkeit der Texte benötigen eine Prüfung.",
  TEXT_QUALITY_FAILED: "Die drei Texte bestehen die gemeinsame Sprach- und Unterschiedlichkeitsprüfung noch nicht.",
  STRICT_FORMAT_QUALITY_FAILED: "Mindestens ein Text enthält eine unzulässige Formulierung oder einen Formatfehler.",
  UNSUPPORTED_PROPERTY_FEATURE: "Mindestens ein Text nennt eine unbelegte Ausstattung.", ROOM_COUNT_CONTRADICTION: "Mindestens ein Text enthält eine abweichende Zimmerzahl.",
  FACT_AUDIT_NOT_PASSED: "Die Faktenprüfung der aktuellen Texte ist nicht erfolgreich abgeschlossen.",
  IMAGE_AUDIT_INCOMPLETE: "Es fehlt mindestens ein vollständig geprüftes Foto.", IMAGE_AUDIT_INVALID: "Die Bildprüfungen sind nicht vollständig und eindeutig zugeordnet.",
  IMAGE_REVIEW_REQUIRED: "Mindestens ein Foto benötigt eine manuelle Prüfung der Eignung, Qualität oder Duplikate.",
};
export function describePremiumQualityReasons(reasons: readonly string[]) {
  return reasons.map(reason => PREMIUM_REASON_LABELS[reason] ?? "Eine verpflichtende Qualitätsprüfung ist noch offen.").join(" ");
}

export function arePremiumCoreFactsDocumented(facts: PremiumFacts, evidence: { values: { rooms: string; livingArea: string; price: string }; currency?: string; ambiguousPriceUnits?: boolean } | undefined) {
  if (!evidence?.values || evidence.ambiguousPriceUnits) return false;
  // The deterministic document guard currently verifies residential core fields.
  // Other types need explicit manual confirmation until their source extraction is equally complete.
  if (premiumPropertyKind(facts.propertyType) !== "residential") return false;
  if (premiumNumber(facts.rooms) !== premiumNumber(evidence.values.rooms) || !premiumNumber(evidence.values.rooms) ||
    premiumNumber(facts.livingArea) !== premiumNumber(evidence.values.livingArea) || !premiumNumber(evidence.values.livingArea)) return false;
  if (facts.marketingType !== "sale" && facts.marketingType !== "rent") return false;
  return !!premiumNumber(evidence.values.price) && premiumNumber(facts.price) === premiumNumber(evidence.values.price) &&
    evidence.currency === facts.currency && (facts.currency === "EUR" || facts.currency === "CHF");
}
