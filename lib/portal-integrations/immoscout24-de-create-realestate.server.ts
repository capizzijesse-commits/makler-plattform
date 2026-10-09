import "server-only";

/**
 * ImmoScout24 DE - Create RealEstate V1
 *
 * Vorbereitung und Antwortprüfung.
 * Keine Netzwerkzugriffe.
 * Keine automatische Veröffentlichung.
 */

export type ImmoScout24DeCreateRequestV1 = {
  method: "POST";
  path: "/restapi/api/offer/v1.0/user/me/realestate/";
  contentType: "application/xml";
  body: string;
  externalId: string;
  environment: "sandbox";
};

export type ImmoScout24DeCreateResultV1 = {
  ok: true;
  externalObjectId: string;
  state: "INACTIVE";
  published: false;
};

function fail(code: string, message: string): never {
  throw Object.assign(new Error(message), { code });
}

export function prepareImmoScout24DeCreateV1(input: {
  environment: "sandbox" | "production";
  xml: string;
  externalId: string;
}): ImmoScout24DeCreateRequestV1 {
  if (input.environment !== "sandbox") {
    fail(
      "IMMOSCOUT24_DE_CREATE_PRODUCTION_LOCKED",
      "Produktion ist für Create V1 noch gesperrt."
    );
  }

  const xml = input.xml.trim();
  const externalId = input.externalId.trim();

  if (!externalId || !/^[a-zA-Z0-9_-]{1,100}$/.test(externalId)) {
    fail(
      "IMMOSCOUT24_DE_EXTERNAL_ID_INVALID",
      "Eine gültige externe Objekt-ID fehlt."
    );
  }

  if (
    !/<realestates:apartmentBuy\b/.test(xml) ||
    !/<\/realestates:apartmentBuy>\s*$/.test(xml)
  ) {
    fail(
      "IMMOSCOUT24_DE_CREATE_XML_INVALID",
      "Create V1 unterstützt nur apartmentBuy-XML."
    );
  }

  const externalIdMatch = xml.match(
    /<externalId>([^<]*)<\/externalId>/g
  );

  if (
    externalIdMatch?.length !== 1 ||
    externalIdMatch[0] !==
      `<externalId>${externalId}</externalId>`
  ) {
    fail(
      "IMMOSCOUT24_DE_EXTERNAL_ID_MISMATCH",
      "Die externe Objekt-ID stimmt nicht mit dem XML überein."
    );
  }

  return {
    method: "POST",
    path: "/restapi/api/offer/v1.0/user/me/realestate/",
    contentType: "application/xml",
    body: xml,
    externalId,
    environment: "sandbox",
  };
}

export function parseImmoScout24DeCreateResponseV1(input: {
  statusCode: number;
  raw: string;
}): ImmoScout24DeCreateResultV1 {
  if (
    input.statusCode < 200 ||
    input.statusCode >= 300
  ) {
    fail(
      "IMMOSCOUT24_DE_CREATE_HTTP_FAILED",
      `Objekterstellung nicht bestätigt: HTTP ${input.statusCode}.`
    );
  }

  // V1: eng begrenzte Auswertung des bestätigten
  // Create-Antwortmusters. Kein vollständiger XML-Parser.
  const createdIds = Array.from(
    input.raw.matchAll(
      /<messageCode>\s*MESSAGE_RESOURCE_CREATED\s*<\/messageCode>(?:\s*<message>[^<]*<\/message>)?\s*<id>\s*(\d+)\s*<\/id>/g
    ),
    (match) => match[1]
  );

  if (createdIds.length !== 1) {
    fail(
      "IMMOSCOUT24_DE_CREATE_UNCONFIRMED",
      "Keine eindeutige ImmoScout24-Objekt-ID bestätigt. Vor einem erneuten POST muss der Objektstatus geprüft werden."
    );
  }

  return {
    ok: true,
    externalObjectId: createdIds[0],
    state: "INACTIVE",
    published: false,
  };
}
