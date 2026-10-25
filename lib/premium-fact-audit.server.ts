import type OpenAI from "openai";
import type { ListingTextVariant } from "./listing-text-quality";

type GermanyFactAuditCode =
  | "PROPERTY_STRUCTURE"
  | "ROOM_LAYOUT"
  | "PRICE_OR_INCLUSION"
  | "AVAILABILITY_OR_LEGAL_STATUS"
  | "ACCESSIBILITY"
  | "LOCATION_OR_INFRASTRUCTURE"
  | "UTILITY_OR_SERVICING"
  | "PHYSICAL_RELATIONSHIP"
  | "CONDITION_OR_RENOVATION_SCOPE"
  | "OWNERSHIP_OR_USE_RIGHT"
  | "OTHER_MATERIAL_FACT";

type GermanyFactAuditFinding = {
  variantNumber: number;
  field: "title" | "sentence";
  sentenceNumber: number | null;
  text: string;
  code: GermanyFactAuditCode;
  reason: string;
};

type GermanyFactAuditResult = {
  findings: GermanyFactAuditFinding[];
  durationMs: number;
};


export function splitMaterialAuditSentences(
  value: string
): string[] {
  return value
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) =>
      sentence.trim()
    )
    .filter(Boolean);
}

export async function requestMaterialFactAudit(
  openai: OpenAI,
  prompt: { facts: Record<string, unknown>; market?: string },
  variants: ListingTextVariant[]
): Promise<GermanyFactAuditResult> {
  const startedAt = Date.now();

  const auditVariants =
    variants.map(
      (variant, index) => ({
        variantNumber: index + 1,
        title: variant.title,
        sentences:
          splitMaterialAuditSentences(
            variant.text
          ).map(
            (sentence, sentenceIndex) => ({
              sentenceNumber:
                sentenceIndex + 1,
              text: sentence,
            })
          ),
      })
    );

  const completion =
    await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are the HARD FACT auditor for Inserat-AI. Check only explicit verified source facts. When verifiedSourceText is supplied, also check proposed scalar facts and all text claims against that original source. Derived summaries are hypotheses, not additional evidence. A source omission never authorizes an AI-inferred fact. Report unsupported core facts even if a derived field claims them. Explicit manual confirmations may supply corrections; never silently reinterpret a unit price as a total price.

EVIDENCE REQUIREMENTS FOR MATERIAL CLAIMS:
- Never infer flexible room arrangement from room count/area, suitability for gardens/additional installations from plot size, market positioning from an asking price, or parking demand coverage from parking-space count.
- A named energy class is not measured consumption, even with hedges such as suggests/indicates. Asking price does not establish its calculation or fairness.
- Require explicit supporting source evidence for each relationship and cite the precise offending sentence and missing proof. These are material claims, not harmless generic marketing.
- A construction year never proves compliance with current building standards or regulations.
- Heating equipment and an energy class do not prove operating costs, profitability, actual consumption or comprehensive environmental sustainability.
- A named heat pump does not prove device efficiency; an energy class alone does not substantiate inferred low energy demand. Require the specific performance/demand source even when the claim says suggests or indicates.
- Construction year and an equipment list do not establish contemporary construction quality or well-designed technical equipment. Report the exact unsupported quality inference, not the neutral scalar facts.
- A room count or floor area does not prove a well-designed layout, building structure or functional architectural design.
- A parking-space count does not prove where the spaces are located, direct access or their physical relationship to the building or plot.
- For these assertions require an explicit source statement supporting the specific relationship, not merely related facts. Cite the exact offending sentence and identify the missing evidence in reason. Do not treat these as harmless marketing adjectives.

You are NOT a copywriter and NOT a style critic.

Your sole task is to identify MATERIAL factual claims that could give a prospective buyer, tenant or broker an incorrect understanding of the property.

Do NOT report harmless marketing language, ordinary wording, stylistic weakness or obvious neutral descriptions of an explicitly stated feature.

REPORT ONLY claims that belong to one of these codes:

PROPERTY_STRUCTURE
- Invented building type, number of floors, number of units, freestanding construction or other building structure.

ROOM_LAYOUT
- Invented named rooms, room relationships, floor distribution, direct room connections or a specific layout.

PRICE_OR_INCLUSION
- Invented inclusion in purchase price, rent or offer.
- Invented separate price or financial condition.

AVAILABILITY_OR_LEGAL_STATUS
- Vacancy presented as immediate move-in, immediate handover or guaranteed availability.
- Invented tenancy, legal, approval or contractual status.

ACCESSIBILITY
- Elevator presented as barrier-free access when barrier-free access was not explicitly supplied.
- Invented step-free or unrestricted accessibility.

LOCATION_OR_INFRASTRUCTURE
- Invented central, prestigious, established, quiet or prime location.
- Invented transport, schools, shopping, infrastructure or amenities.

UTILITY_OR_SERVICING
- Erschlossen expanded into specific water, electricity, wastewater, telecom or other connections.
- Erschlossen expanded into immediate construction, reduced costs, faster approval or simpler planning.

PHYSICAL_RELATIONSHIP
- Invented direct access, connection or physical relationship between terrace, garden, rooms, garage, courtyard or other features.

CONDITION_OR_RENOVATION_SCOPE
- Renoviert expanded into fully/comprehensively renovated, modern standard or a specific quality condition.
- Renovierungsbedürftig expanded into extensive/comprehensive works, exact required works or costs.
- Older windows do not prove that replacement is mandatory.

OWNERSHIP_OR_USE_RIGHT
- Invented private, communal, exclusive or legally assigned use.
- Invented ownership association or rights.

OTHER_MATERIAL_FACT
- Use only for another concrete factual statement that would materially alter a buyer's understanding.

IMPORTANT SAFE STATEMENTS — DO NOT REPORT:
- A balcony or terrace may be called an Außenbereich, Außenfläche or space outdoors.
- A garden may be called an Außenbereich or Gartenfläche.
- A Keller or Kellerabteil may be described as storage space.
- A garage or parking space may be described as a place to park a vehicle.
- A Besprechungsraum may be described as a room for meetings.
- A Teeküche may be described as usable for preparing drinks or small refreshments.
- An Einbauküche may be described as a kitchen for preparing food.
- An Aufzug may be described as providing or easing vertical access. Do not infer barrier-free access.
- Explicit barrierefreier Zugang may be described as barrier-free access and may neutrally be said to facilitate access.
- Direct apartment access by elevator may be repeated exactly and may neutrally be described as direct access.
- Renovierungsbedürftig supports the neutral statement that renovation is required.
- A stated propertyType may be repeated naturally.
- Bahnhof 900 m entfernt or Schule 600 m entfernt may be repeated exactly or described as Nähe zum Bahnhof / Nähe zur Schule.
- A neutral statement that OBJECT FACTS contain no further information is allowed.
- A statement such as "vermietet, was für Kapitalanleger interessant sein kann" is marketing framing, not a material factual error.
- Words such as praktisch, interessant, attraktiv, hochwertig, großzügig, modern or komfortabel are marketing language by themselves. Do not report them unless they are used to assert a concrete unsupported fact.
- Do not report generic target-group language unless it falsely asserts a concrete property fact.

Examples:

SAFE:
"Der Balkon bietet zusätzlichen Außenraum."
"Ein Besprechungsraum steht für Meetings zur Verfügung."
"Der Keller bietet zusätzlichen Stauraum."
"Der barrierefreie Zugang erleichtert den Zutritt."
"Die Wohnung ist vermietet, was für Kapitalanleger interessant sein kann."

REPORT:
"Die Wohnung befindet sich in einem Mehrparteienhaus."
when OBJECT FACTS only say Eigentumswohnung.

REPORT:
"Der Tiefgaragenstellplatz ist im Kaufpreis enthalten."
when inclusion was not explicitly supplied.

REPORT:
"Die Wohnung ist sofort bezugsfrei."
when OBJECT FACTS only say leerstehend.

REPORT:
"Der Aufzug gewährleistet barrierefreien Zugang."
when barrierefreier Zugang was not explicitly supplied.

REPORT:
"Das erschlossene Grundstück verfügt über Strom-, Wasser- und Abwasseranschlüsse."
when OBJECT FACTS only say erschlossen.

REPORT:
"Die fünf Zimmer verteilen sich auf zwei Etagen."
when floors were not supplied.

When uncertain whether something is merely marketing language or a material factual error, DO NOT report it.

Return JSON only.

OUTPUT:
{
  "findings": [
    {
      "variantNumber": 1,
      "field": "sentence",
      "sentenceNumber": 3,
      "text": "Exact sentence containing the material error",
      "code": "PROPERTY_STRUCTURE",
      "reason": "Short factual explanation"
    }
  ]
}

Every result must also contain "completed":true and "checkedVariants":[1,2,3].
If there is no material factual error, return {"completed":true,"checkedVariants":[1,2,3],"findings":[]}.
`.trim(),
        },
        {
          role: "user",
          content: `
TARGET MARKET:
${prompt.market ?? "unspecified"}

OBJECT FACTS:
${JSON.stringify(
  prompt.facts,
  null,
  2
)}

FINAL TEXTS TO AUDIT:
${JSON.stringify(
  auditVariants,
  null,
  2
)}
`.trim(),
        },
      ],
      temperature: 0,
      max_tokens: 1400,
      response_format: {
        type: "json_object",
      },
    });

  if (completion.choices[0]?.finish_reason !== "stop") throw new Error("PREMIUM_FACT_AUDIT_INCOMPLETE");
  const content =
    completion.choices[0]
      ?.message?.content ?? "";

  let parsed:
    | { findings?: unknown; completed?: unknown; checkedVariants?: unknown }
    | undefined;

  try {
    parsed = JSON.parse(content) as {
      findings?: unknown; completed?: unknown; checkedVariants?: unknown;
    };
  } catch {
    parsed = undefined;
  }

  if (!parsed || parsed.completed !== true || !Array.isArray(parsed.checkedVariants) || parsed.checkedVariants.length !== 3 || [1,2,3].some(n => !(parsed.checkedVariants as unknown[]).includes(n)) || !Array.isArray(parsed.findings)) throw new Error("PREMIUM_FACT_AUDIT_INVALID");
  const rawFindings = parsed.findings;

  const allowedCodes =
    new Set<GermanyFactAuditCode>([
      "PROPERTY_STRUCTURE",
      "ROOM_LAYOUT",
      "PRICE_OR_INCLUSION",
      "AVAILABILITY_OR_LEGAL_STATUS",
      "ACCESSIBILITY",
      "LOCATION_OR_INFRASTRUCTURE",
      "UTILITY_OR_SERVICING",
      "PHYSICAL_RELATIONSHIP",
      "CONDITION_OR_RENOVATION_SCOPE",
      "OWNERSHIP_OR_USE_RIGHT",
      "OTHER_MATERIAL_FACT",
    ]);

  const findings:
    GermanyFactAuditFinding[] = [];

  for (const value of rawFindings) {
    if (
      !value ||
      typeof value !== "object"
    ) {
      throw new Error("PREMIUM_FACT_AUDIT_INVALID");
    }

    const finding =
      value as Record<string, unknown>;

    const variantNumber =
      typeof finding.variantNumber === "number"
        ? finding.variantNumber
        : Number.NaN;

    const field =
      finding.field === "title" ||
      finding.field === "sentence"
        ? finding.field
        : null;

    const sentenceNumber =
      typeof finding.sentenceNumber === "number"
        ? finding.sentenceNumber
        : null;

    const text =
      typeof finding.text === "string"
        ? finding.text.trim()
        : "";

    const reason =
      typeof finding.reason === "string"
        ? finding.reason.trim()
        : "";

    const rawCode =
      typeof finding.code === "string"
        ? finding.code.trim()
        : "";

    if (
      !Number.isInteger(variantNumber) ||
      variantNumber < 1 ||
      variantNumber > 3 ||
      !field ||
      !text || !reason ||
      (field === "sentence" && (!Number.isInteger(sentenceNumber) || sentenceNumber! < 1 || sentenceNumber! > (auditVariants[variantNumber - 1]?.sentences.length ?? 0))) ||
      !allowedCodes.has(
        rawCode as GermanyFactAuditCode
      )
    ) {
      throw new Error("PREMIUM_FACT_AUDIT_INVALID");
    }

    findings.push({
      variantNumber,
      field,
      sentenceNumber:
        field === "sentence"
          ? sentenceNumber
          : null,
      text,
      code:
        rawCode as GermanyFactAuditCode,
      reason,
    });
  }

  return {
    findings,
    durationMs:
      Date.now() - startedAt,
  };
}
