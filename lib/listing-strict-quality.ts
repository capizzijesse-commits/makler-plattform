import type { ListingTextVariant } from "./listing-text-quality";
const STRICT_BAD_COPY_RULES = [
  /\bnicht angegeben\b/i,
  /\bnicht spezifiziert\b/i,
  /\bnicht dokumentiert\b/i,
  /\bliegen nicht vor\b/i,
  /\bkeine angaben\b/i,
  /\bkeine informationen\b/i,
  /\bweitere ausk(?:u|\u00fc)nfte\b/i,
  /\bweitere informationen\b/i,
  /\bbest(?:a|ae|\u00e4)tigte eckdaten\b/i,
  /\bobjektunterlagen\b/i,
  /\bvor ort beurteilen\b/i,
  /\bfundierte grundlage f(?:u|ue|\u00fc)r die eigene entscheidung\b/i,
] as const;
export function findStrictQualityIssues(
  variant: ListingTextVariant
): string[] {
  const issues: string[] = [];

  const title =
    variant.title.trim();

  const text =
    variant.text.trim();

  const combined =
    `${title}\n${text}`;

  for (
    const pattern
    of STRICT_BAD_COPY_RULES
  ) {
    if (
      pattern.test(
        combined
      )
    ) {
      issues.push(
        "UNPROFESSIONAL_META_COPY"
      );
      break;
    }
  }

  if (
    title.length < 8 ||
    title.length > 100
  ) {
    issues.push(
      "MALFORMED_TITLE"
    );
  }

  if (
    /(?:\.\.\.|[,;:]\s*)$/.test(
      title
    )
  ) {
    issues.push(
      "BROKEN_TITLE_ENDING"
    );
  }

  const firstSentence =
    text
      .split(
        /(?<=[.!?])\s+/
      )[0]
      ?.trim() ??
    "";

  if (
    firstSentence &&
    /^[a-z\u00e4\u00f6\u00fc\u00df]/.test(
      firstSentence
    )
  ) {
    issues.push(
      "BROKEN_OPENING_FRAGMENT"
    );
  }

  if (
    /\b(?:ionen|offene f)\b/i.test(
      combined
    )
  ) {
    issues.push(
      "CORRUPTED_TEXT_FRAGMENT"
    );
  }

  return [
    ...new Set(
      issues
    ),
  ];
}
