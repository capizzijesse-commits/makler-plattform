import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  SWISS_POSTAL_LOCATIONS,
  type SwissPostalLocation,
} from "@/lib/swissLocations";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type LocationAssistantRequest = {
  postalCode?: unknown;
  location?: unknown;
};

const CANTON_NAMES: Record<string, string> = {
  AG: "Aargau",
  AI: "Appenzell Innerrhoden",
  AR: "Appenzell Ausserrhoden",
  BE: "Bern",
  BL: "Basel-Landschaft",
  BS: "Basel-Stadt",
  FR: "Freiburg",
  GE: "Genf",
  GL: "Glarus",
  GR: "Graubünden",
  JU: "Jura",
  LU: "Luzern",
  NE: "Neuenburg",
  NW: "Nidwalden",
  OW: "Obwalden",
  SG: "St. Gallen",
  SH: "Schaffhausen",
  SO: "Solothurn",
  SZ: "Schwyz",
  TG: "Thurgau",
  TI: "Tessin",
  UR: "Uri",
  VD: "Waadt",
  VS: "Wallis",
  ZG: "Zug",
  ZH: "Zürich",
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocationName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("de-CH");
}

function findLocation(
  postalCode: string,
  location: string
): SwissPostalLocation | null {
  const normalizedName = normalizeLocationName(location);

  if (postalCode && normalizedName) {
    const exactMatch = SWISS_POSTAL_LOCATIONS.find(
      (entry) =>
        entry.zip === postalCode &&
        normalizeLocationName(entry.name) === normalizedName
    );

    if (exactMatch) {
      return exactMatch;
    }
  }

  if (postalCode) {
    const zipMatch = SWISS_POSTAL_LOCATIONS.find(
      (entry) => entry.zip === postalCode
    );

    if (zipMatch) {
      return zipMatch;
    }
  }

  if (normalizedName) {
    const exactNameMatch = SWISS_POSTAL_LOCATIONS.find(
      (entry) =>
        normalizeLocationName(entry.name) === normalizedName
    );

    if (exactNameMatch) {
      return exactNameMatch;
    }

    const partialMatches = SWISS_POSTAL_LOCATIONS.filter((entry) =>
      normalizeLocationName(entry.name).includes(normalizedName)
    );

    if (partialMatches.length === 1) {
      return partialMatches[0];
    }
  }

  return null;
}

function buildSuggestions(
  postalCode: string,
  location: string
): SwissPostalLocation[] {
  const normalizedName = normalizeLocationName(location);

  const suggestions = SWISS_POSTAL_LOCATIONS.filter((entry) => {
    const zipMatches =
      postalCode.length >= 2 && entry.zip.startsWith(postalCode);

    const nameMatches =
      normalizedName.length >= 2 &&
      normalizeLocationName(entry.name).includes(normalizedName);

    return zipMatches || nameMatches;
  });

  const unique = new Map<string, SwissPostalLocation>();

  for (const suggestion of suggestions) {
    unique.set(
      `${suggestion.zip}-${suggestion.name}-${suggestion.canton}`,
      suggestion
    );

    if (unique.size >= 6) {
      break;
    }
  }

  return Array.from(unique.values());
}

function buildLocationDescription(
  match: SwissPostalLocation
): string {
  const cantonName =
    CANTON_NAMES[match.canton] || match.canton;

  return [
    `Die Immobilie befindet sich in ${match.zip} ${match.name} im Kanton ${cantonName}.`,
    "Der Standort bietet eine attraktive Ausgangslage für Alltag, Beruf und Freizeit.",
    "Öffentlicher Verkehr, Schulen, Einkaufsmöglichkeiten und Naherholungsangebote werden im nächsten Ausbauschritt anhand der vollständigen Objektadresse automatisch ermittelt und mit konkreten Distanzen ergänzt.",
  ].join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    const body = (await request.json().catch(() => null)) as
      | LocationAssistantRequest
      | null;

    const postalCode = normalizeText(body?.postalCode);
    const location = normalizeText(body?.location);

    if (!postalCode && !location) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte PLZ oder Ort eingeben.",
        },
        { status: 400 }
      );
    }

    const match = findLocation(postalCode, location);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Der Ort konnte im amtlichen Schweizer Ortschaftenverzeichnis nicht eindeutig gefunden werden.",
          suggestions: buildSuggestions(postalCode, location),
        },
        { status: 404 }
      );
    }

    const cantonName =
      CANTON_NAMES[match.canton] || match.canton;

    const locationData = {
      version: 1,
      source: "swisstopo",
      country: "Schweiz",
      postalCode: match.zip,
      location: match.name,
      canton: match.canton,
      cantonName,
      matchedAt: new Date().toISOString(),
      categories: [
        {
          key: "publicTransport",
          label: "Öffentlicher Verkehr",
          status: "address_required",
          text:
            "Für genaue Haltestellen, Verbindungen und Gehzeiten wird die vollständige Objektadresse benötigt.",
        },
        {
          key: "schools",
          label: "Schulen und Betreuung",
          status: "address_required",
          text:
            "Schulen, Kindergärten und Betreuungseinrichtungen werden nach Eingabe der vollständigen Adresse ergänzt.",
        },
        {
          key: "shopping",
          label: "Einkaufen und Versorgung",
          status: "address_required",
          text:
            "Einkaufsmöglichkeiten und Dienstleistungen werden im nächsten Ausbauschritt mit Distanzen ergänzt.",
        },
        {
          key: "leisure",
          label: "Freizeit und Naherholung",
          status: "address_required",
          text:
            "Freizeit-, Sport- und Naherholungsangebote werden anhand der vollständigen Adresse ermittelt.",
        },
      ],
    };

    return NextResponse.json({
      success: true,
      match: {
        zip: match.zip,
        name: match.name,
        canton: match.canton,
        cantonName,
      },
      locationDescription: buildLocationDescription(match),
      locationData,
    });
  } catch (error) {
    console.error(
      "Fehler im Schweizer Standort-Assistenten:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Schweizer Standort-Assistent konnte nicht ausgeführt werden.",
      },
      { status: 500 }
    );
  }
}
