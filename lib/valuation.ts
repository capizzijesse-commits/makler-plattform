export type PropertyType =
  | "apartment"
  | "house"
  | "row-house"
  | "semi-detached";

export type PropertyCondition =
  | "new"
  | "very-good"
  | "good"
  | "average"
  | "renovation";

export type PropertyStandard =
  | "simple"
  | "standard"
  | "good"
  | "luxury";

export type ParkingType =
  | "none"
  | "outdoor"
  | "garage"
  | "underground"
  | "multiple";

export type OutdoorAreaType =
  | "none"
  | "balcony"
  | "terrace"
  | "garden"
  | "multiple";

export type ViewType =
  | "normal"
  | "quiet"
  | "open"
  | "mountain"
  | "lake"
  | "premium";

export type ReferenceConfidence =
  | "high"
  | "medium"
  | "low";

export type ValuationInput = {
  propertyType: PropertyType;

  livingArea: number;
  landArea?: number | null;
  rooms?: number | null;

  yearBuilt?: number | null;
  renovationYear?: number | null;

  condition: PropertyCondition;
  standard: PropertyStandard;

  floor?: number | null;
  lift?: boolean | null;

  parking?: ParkingType | null;
  outdoorArea?: OutdoorAreaType | null;
  view?: ViewType | null;

  /**
   * Muss später aus unserer Schweizer
   * Marktdaten-/Standortschicht kommen.
   *
   * Die Bewertungsengine erfindet diesen
   * Wert ausdrücklich NICHT selbst.
   */
  marketReferencePricePerSqm: number;

  referenceConfidence?: ReferenceConfidence;
};

export type ValuationDriver = {
  key: string;
  label: string;
  impactPercent: number;
  direction:
    | "positive"
    | "negative"
    | "neutral";
};

export type ValuationResult = {
  estimatedValue: number;
  lowerValue: number;
  upperValue: number;

  adjustedPricePerSqm: number;
  marketReferencePricePerSqm: number;

  totalAdjustmentPercent: number;
  uncertaintyPercent: number;

  confidence:
    | "hoch"
    | "mittel"
    | "eingeschränkt";

  positiveDrivers: ValuationDriver[];
  negativeDrivers: ValuationDriver[];
  neutralDrivers: ValuationDriver[];

  drivers: ValuationDriver[];
};

type FactorResult = {
  factor: number;
  driver?: ValuationDriver;
};

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function roundTo(
  value: number,
  step: number
) {
  return Math.round(value / step) * step;
}

function percentFromFactor(
  factor: number
) {
  return Math.round(
    (factor - 1) * 1000
  ) / 10;
}

function createDriver(
  key: string,
  label: string,
  factor: number
): ValuationDriver {
  const impactPercent =
    percentFromFactor(factor);

  return {
    key,
    label,
    impactPercent,
    direction:
      impactPercent > 0
        ? "positive"
        : impactPercent < 0
          ? "negative"
          : "neutral",
  };
}

function conditionFactor(
  condition: PropertyCondition
): FactorResult {
  const map: Record<
    PropertyCondition,
    {
      factor: number;
      label: string;
    }
  > = {
    new: {
      factor: 1.07,
      label: "Neubau / neuwertiger Zustand",
    },
    "very-good": {
      factor: 1.04,
      label: "Sehr guter Objektzustand",
    },
    good: {
      factor: 1,
      label: "Guter Objektzustand",
    },
    average: {
      factor: 0.94,
      label: "Durchschnittlicher Zustand",
    },
    renovation: {
      factor: 0.84,
      label: "Renovationsbedarf",
    },
  };

  const item = map[condition];

  return {
    factor: item.factor,
    driver: createDriver(
      "condition",
      item.label,
      item.factor
    ),
  };
}

function standardFactor(
  standard: PropertyStandard
): FactorResult {
  const map: Record<
    PropertyStandard,
    {
      factor: number;
      label: string;
    }
  > = {
    simple: {
      factor: 0.94,
      label: "Einfacher Ausbaustandard",
    },
    standard: {
      factor: 1,
      label: "Marktüblicher Ausbaustandard",
    },
    good: {
      factor: 1.05,
      label: "Gehobener Ausbaustandard",
    },
    luxury: {
      factor: 1.11,
      label: "Hochwertiger Ausbaustandard",
    },
  };

  const item = map[standard];

  return {
    factor: item.factor,
    driver: createDriver(
      "standard",
      item.label,
      item.factor
    ),
  };
}

function ageFactor(
  yearBuilt?: number | null,
  renovationYear?: number | null
): FactorResult {
  if (!yearBuilt) {
    return {
      factor: 1,
      driver: {
        key: "age",
        label: "Baujahr nicht angegeben",
        impactPercent: 0,
        direction: "neutral",
      },
    };
  }

  const currentYear =
    new Date().getFullYear();

  const effectiveYear =
    renovationYear &&
    renovationYear > yearBuilt
      ? yearBuilt +
        (renovationYear - yearBuilt) * 0.6
      : yearBuilt;

  const effectiveAge =
    Math.max(
      0,
      currentYear - effectiveYear
    );

  let factor = 1;

  if (effectiveAge <= 5) {
    factor = 1.04;
  } else if (effectiveAge <= 15) {
    factor = 1.02;
  } else if (effectiveAge <= 30) {
    factor = 1;
  } else if (effectiveAge <= 45) {
    factor = 0.97;
  } else if (effectiveAge <= 65) {
    factor = 0.94;
  } else {
    factor = 0.91;
  }

  if (
    renovationYear &&
    currentYear - renovationYear <= 10
  ) {
    factor = Math.min(
      factor + 0.03,
      1.04
    );
  }

  const label =
    renovationYear
      ? `Baujahr ${yearBuilt}, Renovation ${renovationYear}`
      : `Baujahr ${yearBuilt}`;

  return {
    factor,
    driver: createDriver(
      "age",
      label,
      factor
    ),
  };
}

function viewFactor(
  view?: ViewType | null
): FactorResult {
  const map: Record<
    ViewType,
    {
      factor: number;
      label: string;
    }
  > = {
    normal: {
      factor: 1,
      label: "Normale Wohnlage",
    },
    quiet: {
      factor: 1.02,
      label: "Besonders ruhige Lage",
    },
    open: {
      factor: 1.035,
      label: "Freie Aussicht",
    },
    mountain: {
      factor: 1.045,
      label: "Bergsicht",
    },
    lake: {
      factor: 1.08,
      label: "See- oder Wassersicht",
    },
    premium: {
      factor: 1.1,
      label: "Aussergewöhnliche Premiumlage",
    },
  };

  if (!view) {
    return {
      factor: 1,
    };
  }

  const item = map[view];

  return {
    factor: item.factor,
    driver: createDriver(
      "view",
      item.label,
      item.factor
    ),
  };
}

function parkingFactor(
  parking?: ParkingType | null
): FactorResult {
  const map: Record<
    ParkingType,
    {
      factor: number;
      label: string;
    }
  > = {
    none: {
      factor: 0.98,
      label: "Keine eigene Parkierung",
    },
    outdoor: {
      factor: 1,
      label: "Aussenparkplatz",
    },
    garage: {
      factor: 1.02,
      label: "Garage",
    },
    underground: {
      factor: 1.025,
      label: "Tiefgaragenplatz",
    },
    multiple: {
      factor: 1.04,
      label: "Mehrere Parkmöglichkeiten",
    },
  };

  if (!parking) {
    return {
      factor: 1,
    };
  }

  const item = map[parking];

  return {
    factor: item.factor,
    driver: createDriver(
      "parking",
      item.label,
      item.factor
    ),
  };
}

function outdoorFactor(
  outdoorArea?: OutdoorAreaType | null
): FactorResult {
  const map: Record<
    OutdoorAreaType,
    {
      factor: number;
      label: string;
    }
  > = {
    none: {
      factor: 0.985,
      label: "Kein privater Aussenbereich",
    },
    balcony: {
      factor: 1.01,
      label: "Balkon",
    },
    terrace: {
      factor: 1.025,
      label: "Terrasse",
    },
    garden: {
      factor: 1.04,
      label: "Privater Garten",
    },
    multiple: {
      factor: 1.05,
      label: "Mehrere Aussenbereiche",
    },
  };

  if (!outdoorArea) {
    return {
      factor: 1,
    };
  }

  const item = map[outdoorArea];

  return {
    factor: item.factor,
    driver: createDriver(
      "outdoor",
      item.label,
      item.factor
    ),
  };
}

function floorLiftFactor(
  input: ValuationInput
): FactorResult {
  if (
    input.propertyType !== "apartment" ||
    input.floor == null
  ) {
    return {
      factor: 1,
    };
  }

  const floor = input.floor;

  if (
    floor >= 4 &&
    input.lift === false
  ) {
    return {
      factor: 0.96,
      driver: createDriver(
        "floorLift",
        "Höhere Etage ohne Lift",
        0.96
      ),
    };
  }

  if (
    floor >= 3 &&
    input.lift === true
  ) {
    return {
      factor: 1.015,
      driver: createDriver(
        "floorLift",
        "Höhere Etage mit Lift",
        1.015
      ),
    };
  }

  return {
    factor: 1,
    driver: createDriver(
      "floorLift",
      "Etage marktüblich",
      1
    ),
  };
}

function landFactor(
  input: ValuationInput
): FactorResult {
  if (
    input.propertyType === "apartment" ||
    !input.landArea ||
    !input.livingArea
  ) {
    return {
      factor: 1,
    };
  }

  const ratio =
    input.landArea /
    input.livingArea;

  let factor = 1;

  if (ratio < 1.5) {
    factor = 0.97;
  } else if (ratio >= 5) {
    factor = 1.04;
  } else if (ratio >= 3) {
    factor = 1.02;
  }

  const label =
    factor > 1
      ? "Überdurchschnittliche Grundstücksreserve"
      : factor < 1
        ? "Relativ kleine Grundstücksfläche"
        : "Grundstücksfläche marktüblich";

  return {
    factor,
    driver: createDriver(
      "land",
      label,
      factor
    ),
  };
}

function propertyTypeFactor(
  propertyType: PropertyType
): FactorResult {
  const map: Record<
    PropertyType,
    {
      factor: number;
      label: string;
    }
  > = {
    apartment: {
      factor: 1,
      label: "Eigentumswohnung",
    },
    house: {
      factor: 1.02,
      label: "Einfamilienhaus",
    },
    "row-house": {
      factor: 0.99,
      label: "Reihenhaus",
    },
    "semi-detached": {
      factor: 1,
      label: "Doppeleinfamilienhaus",
    },
  };

  const item = map[propertyType];

  return {
    factor: item.factor,
    driver: createDriver(
      "propertyType",
      item.label,
      item.factor
    ),
  };
}

function uncertaintyFor(
  input: ValuationInput
) {
  let uncertainty = 0.075;

  if (
    input.referenceConfidence === "medium"
  ) {
    uncertainty += 0.025;
  }

  if (
    input.referenceConfidence === "low"
  ) {
    uncertainty += 0.05;
  }

  if (!input.yearBuilt) {
    uncertainty += 0.01;
  }

  if (!input.parking) {
    uncertainty += 0.005;
  }

  if (!input.outdoorArea) {
    uncertainty += 0.005;
  }

  if (!input.view) {
    uncertainty += 0.005;
  }

  return clamp(
    uncertainty,
    0.065,
    0.15
  );
}

export function calculateValuation(
  input: ValuationInput
): ValuationResult {
  if (
    !Number.isFinite(input.livingArea) ||
    input.livingArea <= 0
  ) {
    throw new Error(
      "Wohnfläche muss grösser als 0 sein."
    );
  }

  if (
    !Number.isFinite(
      input.marketReferencePricePerSqm
    ) ||
    input.marketReferencePricePerSqm <= 0
  ) {
    throw new Error(
      "Ein gültiger Standort-Referenzpreis pro m² ist erforderlich."
    );
  }

  const factors: FactorResult[] = [
    propertyTypeFactor(
      input.propertyType
    ),
    conditionFactor(
      input.condition
    ),
    standardFactor(
      input.standard
    ),
    ageFactor(
      input.yearBuilt,
      input.renovationYear
    ),
    viewFactor(
      input.view
    ),
    parkingFactor(
      input.parking
    ),
    outdoorFactor(
      input.outdoorArea
    ),
    floorLiftFactor(
      input
    ),
    landFactor(
      input
    ),
  ];

  const rawCombinedFactor =
    factors.reduce(
      (result, item) =>
        result * item.factor,
      1
    );

  /**
   * Schutz gegen unrealistische
   * Kumulierung vieler Zuschläge.
   */
  const combinedFactor =
    clamp(
      rawCombinedFactor,
      0.72,
      1.35
    );

  const adjustedPricePerSqm =
    input.marketReferencePricePerSqm *
    combinedFactor;

  const rawEstimatedValue =
    adjustedPricePerSqm *
    input.livingArea;

  const estimatedValue =
    roundTo(
      rawEstimatedValue,
      5000
    );

  const uncertainty =
    uncertaintyFor(input);

  const lowerValue =
    roundTo(
      rawEstimatedValue *
        (1 - uncertainty),
      5000
    );

  const upperValue =
    roundTo(
      rawEstimatedValue *
        (1 + uncertainty),
      5000
    );

  const drivers =
    factors
      .map(
        (item) => item.driver
      )
      .filter(
        (
          driver
        ): driver is ValuationDriver =>
          Boolean(driver)
      );

  const positiveDrivers =
    drivers
      .filter(
        (item) =>
          item.direction === "positive"
      )
      .sort(
        (a, b) =>
          b.impactPercent -
          a.impactPercent
      );

  const negativeDrivers =
    drivers
      .filter(
        (item) =>
          item.direction === "negative"
      )
      .sort(
        (a, b) =>
          a.impactPercent -
          b.impactPercent
      );

  const neutralDrivers =
    drivers.filter(
      (item) =>
        item.direction === "neutral"
    );

  const confidence =
    uncertainty <= 0.08
      ? "hoch"
      : uncertainty <= 0.11
        ? "mittel"
        : "eingeschränkt";

  return {
    estimatedValue,
    lowerValue,
    upperValue,

    adjustedPricePerSqm:
      roundTo(
        adjustedPricePerSqm,
        10
      ),

    marketReferencePricePerSqm:
      input.marketReferencePricePerSqm,

    totalAdjustmentPercent:
      Math.round(
        (combinedFactor - 1) *
          1000
      ) / 10,

    uncertaintyPercent:
      Math.round(
        uncertainty * 1000
      ) / 10,

    confidence,

    positiveDrivers,
    negativeDrivers,
    neutralDrivers,

    drivers,
  };
}
