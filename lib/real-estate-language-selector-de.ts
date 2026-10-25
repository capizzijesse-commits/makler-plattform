import {
  REAL_ESTATE_LANGUAGE_DE,
  type RealEstateLanguageEntryDE,
} from "./real-estate-language-de";

export type LanguageEvidenceStatusDE =
  | "verified"
  | "reported"
  | "uncertain"
  | "conflicted"
  | "absent";

export type LanguageEvidenceDE = {
  entryId: string;
  status: LanguageEvidenceStatusDE;
  source: "server_verified" | "document" | "image" | "client";
};

/**
 * Nur serverseitig unabhaengig bestaetigte Merkmale.
 *
 * ACHTUNG: Die aufrufende Serverfunktion muss die Herkunft
 * selbst bestimmen. Diese Funktion authentifiziert keine
 * vom Browser gelieferten source/status-Werte.
 *
 * Ein widerspruechlicher oder negativer Eintrag sperrt
 * das entsprechende Merkmal auch dann, wenn ein weiterer
 * Datensatz es als bestaetigt bezeichnet.
 *
 * Ausgabe: redaktionelle Hinweise, niemals neue Objektfakten.
 */
export function selectRealEstateLanguageDE(
  evidence: readonly LanguageEvidenceDE[],
  maxEntries = 6
): RealEstateLanguageEntryDE[] {
  const safeLimit =
    Number.isSafeInteger(maxEntries) && maxEntries > 0
      ? Math.min(maxEntries, 12)
      : 0;

  if (safeLimit === 0 || !Array.isArray(evidence)) {
    return [];
  }

  const blocked = new Set<string>();
  const verified = new Set<string>();

  for (const item of evidence) {
    if (!item || typeof item.entryId !== "string") {
      continue;
    }

    if (
      item.status === "absent" ||
      item.status === "conflicted" ||
      item.status === "uncertain"
    ) {
      blocked.add(item.entryId);
      continue;
    }

    if (
      item.status === "verified" &&
      item.source === "server_verified"
    ) {
      verified.add(item.entryId);
    }
  }

  return REAL_ESTATE_LANGUAGE_DE.filter(
    (entry) =>
      verified.has(entry.id) &&
      !blocked.has(entry.id)
  ).slice(0, safeLimit);
}