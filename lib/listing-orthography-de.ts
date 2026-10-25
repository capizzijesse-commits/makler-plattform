/**
 * German-market orthography normalization.
 *
 * Conservative, deterministic and independent of AI calls.
 * Only apply to final DE title/description output.
 */
export function normalizeGermanOrthographyDE(
  value: string
): string {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const replacements: ReadonlyArray<readonly [RegExp, string]> = [
    [/(?<![\p{L}])grosszügig/giu, "großzügig"],
    [/(?<![\p{L}])gross(?=e(?:[nmsr])?\b)/giu, "groß"],
    [/(?<![\p{L}])aussen(?=(?:bereich|anlage|stellplatz|stellplätze|parkplatz|parkplätze|fläche|flächen|raum))/giu, "außen"],
    [/(?<![\p{L}])fussbodenheizung/giu, "fußbodenheizung"],
    [/(?<![\p{L}])massnahm/giu, "maßnahm"],
    [/(?<![\p{L}])äusserst/giu, "äußerst"],
    [/(?<![\p{L}])anschliessend/giu, "anschließend"],
  ];

  let result = value;

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, (matched) =>
      /^[A-ZÄÖÜ]/u.test(matched)
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement
    );
  }

  return result;
}