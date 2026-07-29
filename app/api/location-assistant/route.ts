import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  SWISS_POSTAL_LOCATIONS,
  type SwissPostalLocation,
} from "@/lib/swissLocations";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type AppLocale = "de" | "it" | "fr" | "en";

type LocationAssistantRequest = {
  postalCode?: unknown;
  location?: unknown;
  locale?: unknown;
};

const DEFAULT_LOCALE: AppLocale = "de";

const CANTON_NAMES: Record<AppLocale, Record<string, string>> = {
  de: {
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
  },
  it: {
    AG: "Argovia",
    AI: "Appenzello Interno",
    AR: "Appenzello Esterno",
    BE: "Berna",
    BL: "Basilea Campagna",
    BS: "Basilea Città",
    FR: "Friburgo",
    GE: "Ginevra",
    GL: "Glarona",
    GR: "Grigioni",
    JU: "Giura",
    LU: "Lucerna",
    NE: "Neuchâtel",
    NW: "Nidvaldo",
    OW: "Obvaldo",
    SG: "San Gallo",
    SH: "Sciaffusa",
    SO: "Soletta",
    SZ: "Svitto",
    TG: "Turgovia",
    TI: "Ticino",
    UR: "Uri",
    VD: "Vaud",
    VS: "Vallese",
    ZG: "Zugo",
    ZH: "Zurigo",
  },
  fr: {
    AG: "Argovie",
    AI: "Appenzell Rhodes-Intérieures",
    AR: "Appenzell Rhodes-Extérieures",
    BE: "Berne",
    BL: "Bâle-Campagne",
    BS: "Bâle-Ville",
    FR: "Fribourg",
    GE: "Genève",
    GL: "Glaris",
    GR: "Grisons",
    JU: "Jura",
    LU: "Lucerne",
    NE: "Neuchâtel",
    NW: "Nidwald",
    OW: "Obwald",
    SG: "Saint-Gall",
    SH: "Schaffhouse",
    SO: "Soleure",
    SZ: "Schwytz",
    TG: "Thurgovie",
    TI: "Tessin",
    UR: "Uri",
    VD: "Vaud",
    VS: "Valais",
    ZG: "Zoug",
    ZH: "Zurich",
  },
  en: {
    AG: "Aargau",
    AI: "Appenzell Innerrhoden",
    AR: "Appenzell Ausserrhoden",
    BE: "Bern",
    BL: "Basel-Landschaft",
    BS: "Basel-Stadt",
    FR: "Fribourg",
    GE: "Geneva",
    GL: "Glarus",
    GR: "Graubünden",
    JU: "Jura",
    LU: "Lucerne",
    NE: "Neuchâtel",
    NW: "Nidwalden",
    OW: "Obwalden",
    SG: "St. Gallen",
    SH: "Schaffhausen",
    SO: "Solothurn",
    SZ: "Schwyz",
    TG: "Thurgau",
    TI: "Ticino",
    UR: "Uri",
    VD: "Vaud",
    VS: "Valais",
    ZG: "Zug",
    ZH: "Zurich",
  },
};

const CONTENT = {
  de: {
    country: "Schweiz",
    authError: "Bitte zuerst einloggen.",
    inputError: "Bitte PLZ oder Ort eingeben.",
    notFound:
      "Der Ort konnte im amtlichen Schweizer Ortschaftenverzeichnis nicht eindeutig gefunden werden.",
    serverError:
      "Der Schweizer Standort-Assistent konnte nicht ausgeführt werden.",
    description: (
      match: SwissPostalLocation,
      cantonName: string
    ) =>
      [
        `Die Immobilie befindet sich in ${match.zip} ${match.name} im Kanton ${cantonName}.`,
        "Der Standort bietet eine attraktive Ausgangslage für Alltag, Beruf und Freizeit.",
        "Öffentlicher Verkehr, Schulen, Einkaufsmöglichkeiten und Naherholungsangebote werden im nächsten Ausbauschritt anhand der vollständigen Objektadresse automatisch ermittelt und mit konkreten Distanzen ergänzt.",
      ].join(" "),
    categories: [
      {
        key: "publicTransport",
        label: "Öffentlicher Verkehr",
        text:
          "Für genaue Haltestellen, Verbindungen und Gehzeiten wird die vollständige Objektadresse benötigt.",
      },
      {
        key: "schools",
        label: "Schulen und Betreuung",
        text:
          "Schulen, Kindergärten und Betreuungseinrichtungen werden nach Eingabe der vollständigen Adresse ergänzt.",
      },
      {
        key: "shopping",
        label: "Einkaufen und Versorgung",
        text:
          "Einkaufsmöglichkeiten und Dienstleistungen werden im nächsten Ausbauschritt mit Distanzen ergänzt.",
      },
      {
        key: "leisure",
        label: "Freizeit und Naherholung",
        text:
          "Freizeit-, Sport- und Naherholungsangebote werden anhand der vollständigen Adresse ermittelt.",
      },
    ],
  },
  it: {
    country: "Svizzera",
    authError: "Effettua prima l’accesso.",
    inputError: "Inserisci un NPA o una località.",
    notFound:
      "La località non è stata trovata in modo univoco nell’elenco ufficiale svizzero delle località.",
    serverError:
      "L’assistente svizzero per la posizione non ha potuto essere eseguito.",
    description: (
      match: SwissPostalLocation,
      cantonName: string
    ) =>
      [
        `L’immobile si trova a ${match.zip} ${match.name}, nel Cantone ${cantonName}.`,
        "La posizione offre un punto di partenza interessante per la vita quotidiana, il lavoro e il tempo libero.",
        "I trasporti pubblici, le scuole, le possibilità di acquisto e le aree ricreative saranno determinati automaticamente nella fase successiva sulla base dell’indirizzo completo dell’immobile e completati con distanze concrete.",
      ].join(" "),
    categories: [
      {
        key: "publicTransport",
        label: "Trasporti pubblici",
        text:
          "Per fermate, collegamenti e tempi a piedi precisi è necessario l’indirizzo completo dell’immobile.",
      },
      {
        key: "schools",
        label: "Scuole e assistenza",
        text:
          "Scuole, asili e strutture di assistenza saranno aggiunti dopo l’inserimento dell’indirizzo completo.",
      },
      {
        key: "shopping",
        label: "Acquisti e servizi",
        text:
          "Le possibilità di acquisto e i servizi saranno completati con le distanze nella fase successiva.",
      },
      {
        key: "leisure",
        label: "Tempo libero e svago",
        text:
          "Le offerte per il tempo libero, lo sport e lo svago saranno determinate in base all’indirizzo completo.",
      },
    ],
  },
  fr: {
    country: "Suisse",
    authError: "Veuillez d’abord vous connecter.",
    inputError: "Veuillez saisir un NPA ou une localité.",
    notFound:
      "La localité n’a pas pu être identifiée de manière univoque dans le répertoire officiel suisse des localités.",
    serverError:
      "L’assistant suisse de localisation n’a pas pu être exécuté.",
    description: (
      match: SwissPostalLocation,
      cantonName: string
    ) =>
      [
        `Le bien immobilier se situe à ${match.zip} ${match.name}, dans le canton de ${cantonName}.`,
        "Cette situation offre un point de départ attrayant pour le quotidien, le travail et les loisirs.",
        "Les transports publics, les écoles, les commerces et les possibilités de détente seront déterminés automatiquement lors de la prochaine étape à partir de l’adresse complète du bien, puis complétés par des distances concrètes.",
      ].join(" "),
    categories: [
      {
        key: "publicTransport",
        label: "Transports publics",
        text:
          "L’adresse complète du bien est nécessaire pour déterminer précisément les arrêts, les liaisons et les temps de marche.",
      },
      {
        key: "schools",
        label: "Écoles et accueil",
        text:
          "Les écoles, jardins d’enfants et structures d’accueil seront ajoutés après la saisie de l’adresse complète.",
      },
      {
        key: "shopping",
        label: "Commerces et services",
        text:
          "Les commerces et services seront complétés par des distances lors de la prochaine étape.",
      },
      {
        key: "leisure",
        label: "Loisirs et détente",
        text:
          "Les offres de loisirs, de sport et de détente seront déterminées à partir de l’adresse complète.",
      },
    ],
  },
  en: {
    country: "Switzerland",
    authError: "Please sign in first.",
    inputError: "Please enter a postcode or location.",
    notFound:
      "The location could not be identified unambiguously in the official Swiss directory of localities.",
    serverError:
      "The Swiss location assistant could not be run.",
    description: (
      match: SwissPostalLocation,
      cantonName: string
    ) =>
      [
        `The property is located in ${match.zip} ${match.name}, in the canton of ${cantonName}.`,
        "The location offers an attractive base for everyday life, work and leisure.",
        "Public transport, schools, shopping and recreation options will be determined automatically in the next expansion step using the property’s full address and supplemented with specific distances.",
      ].join(" "),
    categories: [
      {
        key: "publicTransport",
        label: "Public transport",
        text:
          "The property’s full address is required for precise stops, connections and walking times.",
      },
      {
        key: "schools",
        label: "Schools and childcare",
        text:
          "Schools, kindergartens and childcare facilities will be added after the full address is entered.",
      },
      {
        key: "shopping",
        label: "Shopping and services",
        text:
          "Shopping options and services will be supplemented with distances in the next expansion step.",
      },
      {
        key: "leisure",
        label: "Leisure and recreation",
        text:
          "Leisure, sports and recreation options will be determined using the full address.",
      },
    ],
  },
} satisfies Record<
  AppLocale,
  {
    country: string;
    authError: string;
    inputError: string;
    notFound: string;
    serverError: string;
    description: (
      match: SwissPostalLocation,
      cantonName: string
    ) => string;
    categories: Array<{
      key: string;
      label: string;
      text: string;
    }>;
  }
>;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLocale(value: unknown): AppLocale {
  return value === "it" ||
    value === "fr" ||
    value === "en" ||
    value === "de"
    ? value
    : DEFAULT_LOCALE;
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

export async function POST(request: NextRequest) {
  let locale: AppLocale = DEFAULT_LOCALE;

  try {
    const user = await getAuthenticatedUser(request);

    const body = (await request.json().catch(() => null)) as
      | LocationAssistantRequest
      | null;

    locale = normalizeLocale(body?.locale);
    const content = CONTENT[locale];

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: "AUTH_REQUIRED",
          error: content.authError,
        },
        { status: 401 }
      );
    }

    const postalCode = normalizeText(body?.postalCode);
    const location = normalizeText(body?.location);

    if (!postalCode && !location) {
      return NextResponse.json(
        {
          success: false,
          code: "LOCATION_REQUIRED",
          error: content.inputError,
        },
        { status: 400 }
      );
    }

    const match = findLocation(postalCode, location);

    if (!match) {
      return NextResponse.json(
        {
          success: false,
          code: "LOCATION_NOT_FOUND",
          error: content.notFound,
          suggestions: buildSuggestions(postalCode, location),
        },
        { status: 404 }
      );
    }

    const cantonName =
      CANTON_NAMES[locale][match.canton] || match.canton;

    const locationData = {
      version: 2,
      source: "swisstopo",
      country: content.country,
      postalCode: match.zip,
      location: match.name,
      canton: match.canton,
      cantonName,
      matchedAt: new Date().toISOString(),
      categories: content.categories.map((category) => ({
        ...category,
        status: "address_required",
      })),
    };

    return NextResponse.json({
      success: true,
      match: {
        zip: match.zip,
        name: match.name,
        canton: match.canton,
        cantonName,
      },
      locationDescription: content.description(
        match,
        cantonName
      ),
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
        code: "LOCATION_ASSISTANT_ERROR",
        error: CONTENT[locale].serverError,
      },
      { status: 500 }
    );
  }
}
