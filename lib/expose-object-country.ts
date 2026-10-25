export type ObjectCountry = 'DE' | 'CH' | 'AT';
export type ObjectCountryEvidence = {
  status: 'confirmed' | 'missing' | 'conflict';
  origin: 'document';
  candidates: { countryCode: ObjectCountry; quote: string }[];
};

// Only labelled property-country/address/region statements are evidence.
// Market, currency, postal-code length, model guesses and account location are not.
export function objectCountryEvidence(sourceText: string): ObjectCountryEvidence {
  const candidates: ObjectCountryEvidence['candidates'] = [];
  const countryNames: [ObjectCountry, RegExp][] = [
    ['DE', /\b(?:Deutschland|Germany)\b/i],
    ['CH', /\b(?:Schweiz|Switzerland|Suisse|Svizzera)\b/i],
    ['AT', /(?:\bAustria\b|Österreich\b|Oesterreich\b)/i],
  ];
  for (const raw of sourceText.split(/\r?\n/)) {
    const line = raw.trim();
    const country = line.match(/^(?:Objektland|Land(?:\s+des\s+Objekts)?|Country|Objektstandort|Immobilienstandort)\s*:\s*(.+)$/i);
    const address = line.match(/^(?:Ort|Standort|Objektadresse|Adresse(?:\s+des\s+Objekts)?|Bundesland|Kanton)\s*:\s*(.+)$/i);
    const value = country?.[1] ?? address?.[1];
    if (!value || /\?|\b(?:unklar|unbekannt|eventuell|vermutlich|evtl|ungeklärt|nicht|kein)\b/i.test(value)) continue;
    const found = new Set<ObjectCountry>();
    for (const [code, pattern] of countryNames) if (pattern.test(value)) found.add(code);
    for (const code of ['DE', 'CH', 'AT'] as const) {
      // Lowercase "de" in a French street name is not the country code DE.
      if (country && (value.trim().toUpperCase() === code || new RegExp('(?:^|[\\s,;/])'+code+'(?:$|[\\s,;/])').test(value))) found.add(code);
    }
    // A documented German federal state is source evidence, not a city lookup.
    if (address && /\b(?:Bayern|Baden-Württemberg|Baden-Wuerttemberg|Nordrhein-Westfalen|Rheinland-Pfalz|Niedersachsen|Hessen|Saarland|Sachsen(?:-Anhalt)?|Thüringen|Thueringen|Brandenburg|Mecklenburg-Vorpommern|Schleswig-Holstein)\b/i.test(value)) found.add('DE');
    if (/^Bundesland\s*:/i.test(line) && /\b(?:Tirol|Vorarlberg|Steiermark|Burgenland|Kärnten|Kaernten|Oberösterreich|Niederösterreich|Salzburg|Wien)\b/i.test(value)) found.add('AT');
    if (/^Kanton\s*:/i.test(line) && /\b(?:Zürich|Zuerich|Bern|Luzern|Uri|Schwyz|Obwalden|Nidwalden|Glarus|Zug|Freiburg|Solothurn|Basel-Stadt|Basel-Landschaft|Schaffhausen|Appenzell|St\.? Gallen|Graubünden|Graubuenden|Aargau|Thurgau|Tessin|Waadt|Wallis|Neuenburg|Genf|Jura)\b/i.test(value)) found.add('CH');
    for (const code of found) candidates.push({ countryCode: code, quote: line });
  }
  const count = new Set(candidates.map(x => x.countryCode)).size;
  return { status: count === 1 ? 'confirmed' : count ? 'conflict' : 'missing', origin: 'document', candidates };
}

export function applyObjectCountryEvidence<T extends { countryCode: string; missingFields: string[]; requiresManualReview?: boolean }>(facts: T, sourceText: string) {
  const evidence = objectCountryEvidence(sourceText);
  const countryCode: ObjectCountry | '' = evidence.status === 'confirmed' ? evidence.candidates[0].countryCode : '';
  return { ...facts, countryCode, countryEvidence: evidence,
    missingFields: [...facts.missingFields.filter(field => field !== 'countryCode'), ...(!countryCode ? ['countryCode'] : [])],
    requiresManualReview: facts.requiresManualReview === true || !countryCode };
}
