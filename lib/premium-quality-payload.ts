// Canonicalize only technical PDF word geometry BEFORE both persistence and
// hashing. Property facts, source text, confidence and all other numbers retain
// their exact JSON values. The reader must never apply this normalization.
export function canonicalPremiumPayload(payload: unknown, kind: string): unknown {
  const clean = JSON.parse(JSON.stringify(payload));
  if (kind !== 'expose' || !clean || typeof clean !== 'object' || !Array.isArray(clean.documents)) return clean;
  for (const document of clean.documents) {
    if (!Array.isArray(document?.analysis?.pages)) continue;
    for (const page of document.analysis.pages) {
      if (!Array.isArray(page?.words)) continue;
      for (const word of page.words) {
        if (!Array.isArray(word?.box) || word.box.length !== 4 || !word.box.every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) continue;
        // Page-point geometry: six decimal places are far below pixel precision.
        // Avoid Prisma JSON floating-point transport drift in the observed path.
        word.box = word.box.map((v: number) => Number(v.toFixed(6)));
      }
    }
  }
  return clean;
}
