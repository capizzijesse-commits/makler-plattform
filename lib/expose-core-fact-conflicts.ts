export type ExposeCoreField = "rooms" | "livingArea" | "price";
export type ExposeFactConflict = {
  field: ExposeCoreField;
  code: "EXPOSE_CORE_FACT_CONFLICT";
  status: "unresolved" | "manually_resolved";
  candidates: { value: string; currency?: string; evidence: string }[];
};
export type ExposeCoreEvidence = {
  currency?: string;
  ambiguousPriceUnits?: boolean;
  values: Record<ExposeCoreField, string>;
  seen: ExposeCoreField[];
  conflicts: ExposeFactConflict[];
};
const fields: ExposeCoreField[] = ["rooms", "livingArea", "price"];

export function normalizeExposeNumber(raw: string): string | null {
  let text = raw.trim().replace(/[’'\s]/gu, "");
  if (/^\d+(?:½|1\/2)$/u.test(text)) {
    const whole = raw.match(/^\s*(\d+)\s*(?:½|1\s*\/\s*2)\s*$/u);
    return whole ? String(Number(whole[1]) + 0.5) : null;
  }
  if (!/^\d+(?:[.,]\d+)*$/.test(text)) return null;
  const punctuation = [...text.matchAll(/[.,]/g)];
  const last = punctuation.at(-1)?.index;
  if (last !== undefined && text.length - last - 1 <= 2) {
    const integer = text.slice(0, last);
    if (/[.,]/.test(integer) && !/^\d{1,3}(?:[.,]\d{3})+$/.test(integer)) return null;
    text = integer.replace(/[.,]/g, "") + "." + text.slice(last + 1);
  } else if (last !== undefined) {
    if (!/^\d{1,3}(?:[.,]\d{3})+$/.test(text)) return null;
    text = text.replace(/[.,]/g, "");
  }
  const value = Number(text);
  return Number.isFinite(value) && value > 0 ? String(value) : null;
}

export function collectExposeCoreFacts(text: string, priceKind: "sale" | "rent" = "sale"): ExposeCoreEvidence {
  const result: ExposeCoreEvidence = { values: { rooms: "", livingArea: "", price: "" }, seen: [], conflicts: [] };
  if (priceKind === "rent" && /(?:Mietpreis|Kaltmiete|Warmmiete|Nettomiete|Bruttomiete)[\s\S]{0,50}(?:\/|pro\s+)(?:\s*)(?:m²|m2|qm|Quadratmeter)/iu.test(text)) result.ambiguousPriceUnits = true;
  const candidates: Record<ExposeCoreField, ExposeFactConflict["candidates"]> = { rooms: [], livingArea: [], price: [] };
  const number = "(?:\\d{1,3}(?:[.,'’ \\u00a0]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)(?![\\d,'’]|\\.(?!-))";
  const roomNumber = "(?:\\d+\\s*(?:½|1\\s*\\/\\s*2)|" + number + ")";
  const separator = "\\s*[:=,\\-]?\\s*[\"“]?";
  const priceLabels = priceKind === "rent" ? "Mietpreis|Kaltmiete|Warmmiete|Nettomiete|Bruttomiete|Monatsmiete|Jahresmiete" : "Kaufpreis|Verkaufspreis|Angebotspreis";
  const specs: [ExposeCoreField, RegExp, number][] = [
    ["rooms", new RegExp("(?<![\\p{L}])(?:Zimmerzahl|Anzahl\\s+Zimmer|Zimmer)" + separator + "(" + roomNumber + ")", "giu"), 1],
    ["rooms", new RegExp("(?<![\\d.,])(" + roomNumber + ")\\s*[- ]?Zimmer\\b", "giu"), 1],
    ["livingArea", new RegExp("(?<![\\p{L}])(?:Netto[ \\t-]*)?Wohnfl(?:äche|aeche)" + separator + "(" + number + ")", "giu"), 1],
    ["price", new RegExp("(?<![\\p{L}])(?:" + priceLabels + ")(?:[ \\t]*\\((?:19|20)\\d{2}\\)|[ \\t]+(?:19|20)\\d{2}(?=\\s*:))?" + separator + "(EUR|CHF|€)?[ \\t]*(" + number + ")(?:\\.-)?[ \\t]*(EUR|CHF|€)?", "giu"), 2],
  ];
  // Explicitly labelled sections only. Unclear attribution is never silently ignored.
  const excluded = /\b(?:Vergleichsobjekt|Fremdobjekt|Referenzobjekt|historisch\w*|früher\w*|frueher\w*|ehemalig\w*|ursprünglich\w*|urspruenglich\w*|Altpreis)\b/iu;
  let foreignSection = false;
  const lines = text.split(/\r?\n/u);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex];
    // A labelled value may be on the next line in PDF/table text.
    if (/(?:Zimmer(?:zahl)?|Anzahl\s+Zimmer|Wohnfl(?:äche|aeche)|Kaufpreis|Verkaufspreis|Angebotspreis|Mietpreis|Kaltmiete|Warmmiete|Nettomiete|Bruttomiete|Monatsmiete|Jahresmiete)\s*[:=,\-]?\s*$/iu.test(line)) {
      const following = lines[lineIndex + 1]?.trim() ?? "";
      if (/^(?:(?:EUR|CHF|€)\s*)?\d/u.test(following)) line += " " + following;
      else if (/^(?:EUR|CHF|€)$/u.test(following) && /^\s*\d/u.test(lines[lineIndex + 2] ?? "")) line += " " + following + " " + lines[lineIndex + 2];
    }
    if (/^(?:DOKUMENT\s+\d+|---\s*NAECHSTES DOKUMENT|(?:Aktuelles|Angebotenes|Dieses)\s+(?:Objekt|Immobilienobjekt))\b/iu.test(line.trim())) foreignSection = false;
    if (/^\s*(?:Vergleichsobjekt|Fremdobjekt|Referenzobjekt)\s*[:#-]/iu.test(line)) foreignSection = true;
    for (const [field, pattern, valueGroup] of specs) {
      pattern.lastIndex = 0;
      for (const match of line.matchAll(pattern)) {
        if (!result.seen.includes(field)) result.seen.push(field);
        const start = match.index ?? 0;
        const before = line.slice(0, start);
        const context = before.slice(Math.max(before.lastIndexOf(";"), before.lastIndexOf("|")) + 1);
        const historicalYear = field === "price" ? match[0].match(/(?:Kaufpreis|Verkaufspreis|Angebotspreis)\s*\(?((?:19|20)\d{2})(?:\)|\s*:)/iu)?.[1] : undefined;
        if (foreignSection || excluded.test(context) || (historicalYear && Number(historicalYear) < new Date().getFullYear())) continue;
        const value = normalizeExposeNumber(match[valueGroup]);
        if (!value || (field === "rooms" && Number(value) > 30) ||
            (field === "livingArea" && Number(value) > 100000)) continue;
        const currency = field === "price" ? (match[1] || match[3] || "").replace("€", "EUR").toUpperCase() : "";
        candidates[field].push({ value, ...(currency ? { currency } : {}), evidence: line.slice(Math.max(0, start - 60), start + match[0].length + 30).slice(0, 200) });
        if (field === "price" && match[1] && match[3]) {
          const suffixCurrency = match[3].replace("€", "EUR").toUpperCase();
          if (currency !== suffixCurrency) candidates[field].push({ value, currency: suffixCurrency,
            evidence: line.slice(Math.max(0, start - 60), start + match[0].length + 30).slice(0, 200) });
        }
        const range = new RegExp("^\\s*(?:m²|m2|qm|Zimmer|EUR|CHF|€)?\\s*(?:bis\\b|[-–—])\\s*(?:EUR|CHF|€)?\\s*(" + roomNumber + ")", "iu").exec(line.slice(start + match[0].length));
        const rangeValue = range ? normalizeExposeNumber(range[1]) : null;
        if (rangeValue && (field !== "rooms" || Number(rangeValue) <= 30) && (field !== "livingArea" || Number(rangeValue) <= 100000)) {
          candidates[field].push({ value: rangeValue, ...(currency ? { currency } : {}), evidence: (match[0] + range![0]).slice(0, 200) });
        }
      }
    }
  }
  for (const field of fields) {
    const entries = candidates[field];
    const currencies = new Set(entries.map(x => x.currency).filter(Boolean));
    if (field === "price" && currencies.size === 1) result.currency = [...currencies][0];
    const distinct = entries.filter((x, i) => entries.findIndex(y => y.value === x.value && y.currency === x.currency) === i);
    if (new Set(entries.map(x => x.value)).size > 1 || currencies.size > 1) {
      result.conflicts.push({ field, code: "EXPOSE_CORE_FACT_CONFLICT", status: "unresolved", candidates: distinct });
    } else if (entries.length) result.values[field] = entries[0].value;
  }
  return result;
}

export function hasUnresolvedExposeConflicts(value: { factConflicts?: ExposeFactConflict[] }): boolean {
  return (value.factConflicts ?? []).some(x => x.status !== "manually_resolved");
}

export function applyExposeCoreEvidence<T extends { rooms: string; livingArea: string; price: string; missingFields: string[] }>(
  facts: T, evidence: ExposeCoreEvidence
): T & { factConflicts: ExposeFactConflict[]; requiresManualReview: boolean } {
  const next = { ...facts, missingFields: [...facts.missingFields], factConflicts: evidence.conflicts,
    requiresManualReview: evidence.conflicts.length > 0 };
  for (const field of evidence.seen) {
    next[field] = evidence.values[field];
    next.missingFields = next.missingFields.filter(x => x !== field);
    if (!next[field]) next.missingFields.push(field);
  }
  if (next.requiresManualReview) {
    // Free-form AI summaries can contain the same rejected values.
    for (const key of ["projectName", "highlights", "styleText", "sourceSummary"]) {
      if (key in next) (next as Record<string, unknown>)[key] = "";
    }
  }
  return next;
}

export function confirmExposeFactConflicts<T extends { rooms: string; livingArea: string; price: string; missingFields: string[]; factConflicts?: ExposeFactConflict[] }>(facts: T): T {
  const next = { ...facts, missingFields: [...facts.missingFields], factConflicts: (facts.factConflicts ?? []).map(x => ({ ...x })) };
  for (const conflict of next.factConflicts) {
    if (conflict.status === "manually_resolved") continue;
    const value = normalizeExposeNumber(next[conflict.field]);
    if (!value || (conflict.field === "rooms" && Number(value) > 30) ||
        (conflict.field === "livingArea" && Number(value) > 100000)) throw Error("EXPOSE_FACT_CONFLICT_REVIEW_REQUIRED");
    next[conflict.field] = value;
    next.missingFields = next.missingFields.filter(x => x !== conflict.field);
    conflict.status = "manually_resolved";
  }
  return next;
}

// Adapt structured source values to the same deterministic document parser.
// Missing/invalid values and unknown currencies never become invented defaults.
export function collectExposeCoreSourceFacts(
  documentTexts: string[],
  sources: { rooms?: unknown; livingArea?: unknown; price?: unknown; currency?: unknown }[],
  priceKind: "sale" | "rent" = "sale"
): ExposeCoreEvidence {
  const documents = documentTexts.map((text, index) =>
    "DOKUMENT " + (index + 1) + "\n" + text
  );
  for (const [index, source] of sources.entries()) {
    const lines = ["DOKUMENT " + (documentTexts.length + index + 1)];
    const labels = { rooms: "Zimmerzahl", livingArea: "Wohnfläche", price: priceKind === "rent" ? "Mietpreis" : "Kaufpreis" };
    for (const field of fields) {
      const value = source[field];
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      const currency = field === "price" && (source.currency === "EUR" || source.currency === "CHF")
        ? source.currency + " " : "";
      lines.push(labels[field] + ": " + currency + String(value));
    }
    documents.push(lines.join("\n"));
  }
  return collectExposeCoreFacts(documents.join("\n"), priceKind);
}
