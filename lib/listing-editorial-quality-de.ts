/**
 * Inserat-AI – Redaktionelle Textpruefung DE.
 *
 * Nur Diagnose, keine automatische Textaenderung.
 * Keine KI-Anfragen und keine neuen Immobilienfakten.
 */

export type EditorialIssueDE = {
  code:
    | "SOURCE_REFERENCE"
    | "GENERIC_CONCLUSION"
    | "CONDITION_CLAIM"
    | "UNSUPPORTED_BENEFIT"
    | "DE_ORTHOGRAPHY";
  severity: "review" | "style";
  sentence: string;
  explanation: string;
};

export function inspectEditorialQualityDE(
  text: string
): EditorialIssueDE[] {
  if (typeof text !== "string" || !text.trim()) {
    return [];
  }

  // Satzgrenzen konservativ bestimmen; Zahlen mit Dezimalpunkt
  // sollen nicht als Satzende behandelt werden.
  const sentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/u)
    .map((item) => item.trim())
    .filter(Boolean);

  const issues: EditorialIssueDE[] = [];

  const rules: Array<{
    code: EditorialIssueDE["code"];
    severity: EditorialIssueDE["severity"];
    pattern: RegExp;
    explanation: string;
  }> = [
    {
      code: "SOURCE_REFERENCE",
      severity: "review",
      pattern:
        /\b(?:technische(?:n|r|s)?\s+Zeichnungen?|Grundrisspl[aä]ne?|Bildanalys(?:e|en)|Dokumentation|Expos[eé])\b.{0,95}\b(?:zeig(?:t|en)|dokumentier(?:t|en)|beleg(?:t|en)|l[aä]ss(?:t|en)\s+erkennen|enthalten?)\b|\b(?:laut|gem[aä]ss|gemäß)\s+(?:den?\s+)?(?:technische(?:n|r|s)?\s+Zeichnungen?|Grundrisspl[aä]nen?|Bildanalyse)\b/iu,
      explanation:
        "Der Text beschreibt seine Informationsquelle statt unmittelbar die Immobilie."
    },
    {
      code: "GENERIC_CONCLUSION",
      severity: "style",
      pattern:
        /\b(?:die\s+Kombination\s+(?:aus|von)|insgesamt\s+(?:bietet|pr[aä]sentiert)|unterstreicht\s+(?:den|die|das)\s+(?:Charakter|Gesamtbild|Qualit[aä]t|Standard)|pr[aä]gt\s+das\s+(?:Gesamtbild|Objekt))\b/iu,
      explanation:
        "Der Satz verwendet eine austauschbare, wenig informative Schlussformulierung."
    },
    {
      code: "CONDITION_CLAIM",
      severity: "review",
      pattern:
        /\b(?:in\s+(?:einem\s+)?(?:sehr\s+)?guten\s+Zustand|hervorragend(?:er|em|en|es)?\s+Zustand|umfassend\s+saniert|vollst[aä]ndig\s+modernisiert|bestens\s+gepflegt)\b/iu,
      explanation:
        "Die Zustands- oder Sanierungsbewertung muss durch ausdrueckliche Objektangaben gedeckt sein."
    },
    {
      code: "UNSUPPORTED_BENEFIT",
      severity: "review",
      pattern:
        /\b(?:garantiert?|gew[aä]hrleistet?)\s+(?:absolute\s+)?(?:Privatsph[aä]re|Energieeinsparungen?|Wertsteigerung|Ruhe)\b|\b(?:schafft|sorgt\s+f[uü]r)\s+(?:zus[aä]tzliche\s+)?Privatsph[aä]re\b/iu,
      explanation:
        "Eine behauptete Wirkung muss gesondert belegbar sein."
    },
    {
      code: "DE_ORTHOGRAPHY",
      severity: "style",
      pattern:
        /(?<![\p{L}])(?:gross[\p{L}]*|aussen[\p{L}]*|massnahmen|fussbodenheizung)(?![\p{L}])/iu,
      explanation:
        "Schweizer Schreibweise gefunden; deutsche Orthografie pruefen."
    },
  ];

  for (const sentence of sentences) {
    for (const rule of rules) {
      if (!rule.pattern.test(sentence)) {
        continue;
      }

      issues.push({
        code: rule.code,
        severity: rule.severity,
        sentence: sentence.slice(0, 600),
        explanation: rule.explanation
      });
    }
  }

  return issues;
}