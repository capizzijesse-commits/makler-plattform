export type MarketPulseSignalKey =
  | "listingActivity"
  | "brokerDensity"
  | "demandMomentum"
  | "staleListingPressure"
  | "conversionPotential"
  | "inseratAiPenetration";

export type MarketPulseBand =
  | "hot"
  | "strong"
  | "watch"
  | "low";

export type MarketPulseDataQuality =
  | "high"
  | "medium"
  | "low";

export type MarketPulseRegionInput = {
  id: string;
  label: string;
  countryCode: string;

  center?: {
    latitude: number;
    longitude: number;
  };

  signals: Partial<
    Record<
      MarketPulseSignalKey,
      number | null | undefined
    >
  >;

  /*
   * Optional 0..1.
   * Falls nicht geliefert, leiten wir
   * Confidence aus der Signalabdeckung ab.
   */
  confidence?: number | null;
};

export type MarketPulseDriver = {
  key: MarketPulseSignalKey;
  label: string;
  value: number;
  weightedContribution: number;
};

export type MarketPulseRegionScore = {
  id: string;
  label: string;
  countryCode: string;

  center?: {
    latitude: number;
    longitude: number;
  };

  score: number;
  rawScore: number;
  confidence: number;
  signalCoverage: number;

  band: MarketPulseBand;
  dataQuality: MarketPulseDataQuality;

  drivers: MarketPulseDriver[];
  recommendation: string;
};

type SignalDefinition = {
  weight: number;
  invert?: boolean;
  label: string;
};

const SIGNALS: Record<
  MarketPulseSignalKey,
  SignalDefinition
> = {
  listingActivity: {
    weight: 0.24,
    label: "Hohe Inseratsaktivität",
  },

  brokerDensity: {
    weight: 0.16,
    label: "Viele potenzielle Maklerkontakte",
  },

  demandMomentum: {
    weight: 0.16,
    label: "Starke Nachfragedynamik",
  },

  staleListingPressure: {
    weight: 0.14,
    label: "Hoher Vermarktungsdruck",
  },

  conversionPotential: {
    weight: 0.18,
    label: "Hohes Conversion-Potenzial",
  },

  /*
   * Je niedriger die bestehende
   * Inserat-AI-Durchdringung,
   * desto grösser der White-Space.
   */
  inseratAiPenetration: {
    weight: 0.12,
    invert: true,
    label: "Geringe Inserat-AI-Durchdringung",
  },
};

const SIGNAL_KEYS =
  Object.keys(
    SIGNALS
  ) as MarketPulseSignalKey[];

function clamp01(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, value)
  );
}

function round(
  value: number,
  digits = 0
): number {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function getBand(
  score: number
): MarketPulseBand {
  if (score >= 80) {
    return "hot";
  }

  if (score >= 65) {
    return "strong";
  }

  if (score >= 50) {
    return "watch";
  }

  return "low";
}

function getDataQuality(
  confidence: number
): MarketPulseDataQuality {
  if (confidence >= 0.8) {
    return "high";
  }

  if (confidence >= 0.55) {
    return "medium";
  }

  return "low";
}

function getRecommendation(
  band: MarketPulseBand
): string {
  switch (band) {
    case "hot":
      return "Heute priorisieren: hohe Akquise-Chance.";

    case "strong":
      return "Aktiv bearbeiten und gezielt Makler ansprechen.";

    case "watch":
      return "Beobachten und selektiv testen.";

    case "low":
      return "Aktuell keine hohe Akquise-Priorität.";
  }
}

function normalizeSignal(
  key: MarketPulseSignalKey,
  value: number
): number {
  const normalized =
    clamp01(value);

  return SIGNALS[key].invert
    ? 1 - normalized
    : normalized;
}

export function scoreMarketPulseRegion(
  input: MarketPulseRegionInput
): MarketPulseRegionScore {
  const available =
    SIGNAL_KEYS.flatMap(
      (key) => {
        const source =
          input.signals[key];

        if (
          typeof source !== "number" ||
          !Number.isFinite(source)
        ) {
          return [];
        }

        const value =
          normalizeSignal(
            key,
            source
          );

        return [
          {
            key,
            value,
            weight:
              SIGNALS[key].weight,
          },
        ];
      }
    );

  const totalAvailableWeight =
    available.reduce(
      (sum, signal) =>
        sum + signal.weight,
      0
    );

  /*
   * Ohne Daten neutral bleiben.
   * Niemals künstlich "Hot" erzeugen.
   */
  const rawScore =
    totalAvailableWeight > 0
      ? (
          available.reduce(
            (sum, signal) =>
              sum +
              signal.value *
                signal.weight,
            0
          ) /
          totalAvailableWeight
        ) *
        100
      : 50;

  const signalCoverage =
    available.length /
    SIGNAL_KEYS.length;

  const explicitConfidence =
    typeof input.confidence ===
      "number" &&
    Number.isFinite(
      input.confidence
    )
      ? clamp01(
          input.confidence
        )
      : signalCoverage;

  /*
   * Confidence kombiniert:
   * - Qualität der Datenquelle
   * - Breite der vorhandenen Signale
   */
  const confidence =
    clamp01(
      explicitConfidence *
        0.65 +
        signalCoverage *
          0.35
    );

  /*
   * Bei schwacher Datenlage bewegen
   * wir extreme Scores leicht Richtung 50.
   * Das verhindert Scheingenauigkeit.
   */
  const reliabilityFactor =
    0.72 +
    confidence * 0.28;

  const score =
    50 +
    (rawScore - 50) *
      reliabilityFactor;

  const drivers =
    available
      .map((signal) => ({
        key: signal.key,
        label:
          SIGNALS[signal.key]
            .label,
        value:
          round(
            signal.value,
            3
          ),
        weightedContribution:
          round(
            signal.value *
              signal.weight,
            4
          ),
      }))
      .sort(
        (a, b) =>
          b.weightedContribution -
          a.weightedContribution
      )
      .slice(0, 3);

  const finalScore =
    Math.round(
      Math.min(
        100,
        Math.max(
          0,
          score
        )
      )
    );

  const band =
    getBand(
      finalScore
    );

  return {
    id: input.id,
    label: input.label,
    countryCode:
      input.countryCode
        .trim()
        .toUpperCase(),

    center: input.center,

    score:
      finalScore,

    rawScore:
      round(
        rawScore,
        1
      ),

    confidence:
      round(
        confidence,
        2
      ),

    signalCoverage:
      round(
        signalCoverage,
        2
      ),

    band,

    dataQuality:
      getDataQuality(
        confidence
      ),

    drivers,

    recommendation:
      getRecommendation(
        band
      ),
  };
}

export function rankMarketPulseRegions(
  regions: MarketPulseRegionInput[]
): MarketPulseRegionScore[] {
  return regions
    .map(
      scoreMarketPulseRegion
    )
    .sort(
      (a, b) => {
        if (
          b.score !== a.score
        ) {
          return (
            b.score -
            a.score
          );
        }

        return (
          b.confidence -
          a.confidence
        );
      }
    );
}
