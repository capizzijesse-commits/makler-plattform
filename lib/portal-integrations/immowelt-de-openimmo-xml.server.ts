import "server-only";

import type {
  ImmoweltDeOpenImmoCandidate,
} from "./immowelt-de-openimmo-candidate.server";


export type ImmoweltDeOpenImmoProviderInput = {
  company:
    string | null | undefined;

  openImmoAnid:
    string | null | undefined;

  contactName:
    string | null | undefined;

  contactEmail:
    string | null | undefined;

  contactPhone?:
    string | null | undefined;
};


export type ImmoweltDeOpenImmoXmlError = {
  field:
    string;

  code:
    string;

  message:
    string;
};


export type ImmoweltDeOpenImmoXmlResult = {
  ready:
    boolean;

  standard:
    "OpenImmo";

  xmlVersion:
    "1.2.7";

  standardRelease:
    "1.2.7d";

  schemaValidated:
    false;

  immoweltProfileVerified:
    false;

  transportConfigured:
    false;

  networkTested:
    false;

  productionEnabled:
    false;

  errors:
    ImmoweltDeOpenImmoXmlError[];

  xml:
    string | null;
};


function clean(
  value:
    string | null | undefined
):
  string | null {

  const normalized =
    value?.trim();

  return normalized || null;
}


function escapeXml(
  value:
    string
):
  string {

  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&apos;"
    );
}


function decimal(
  value:
    number | null
):
  string | null {

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return String(value);
}


function dateOnly(
  value:
    Date | undefined
):
  string | null {

  if (
    !(value instanceof Date) ||
    Number.isNaN(
      value.getTime()
    )
  ) {
    return null;
  }

  return value
    .toISOString()
    .slice(
      0,
      10
    );
}


function addError(
  errors:
    ImmoweltDeOpenImmoXmlError[],
  field:
    string,
  code:
    string,
  message:
    string
):
  void {

  errors.push({
    field,
    code,
    message,
  });
}


function element(
  name:
    string,
  value:
    string | null
):
  string {

  if (value === null) {
    return "";
  }

  return (
    `<${name}>` +
    escapeXml(
      value
    ) +
    `</${name}>`
  );
}


export function buildImmoweltDeOpenImmoXmlV1(
  input:
    {
      candidate:
        ImmoweltDeOpenImmoCandidate;

      updatedAt:
        Date | undefined;

      provider:
        ImmoweltDeOpenImmoProviderInput;
    }
):
  ImmoweltDeOpenImmoXmlResult {

  const {
    candidate,
    updatedAt,
    provider,
  } =
    input;


  const errors:
    ImmoweltDeOpenImmoXmlError[] =
    [];


  /*
   * Der Candidate muss vorher
   * vollständig bestanden haben.
   */
  if (!candidate.ready) {

    addError(
      errors,
      "candidate",
      "CANDIDATE_NOT_READY",
      "Der OpenImmo Mapping-Kandidat ist noch nicht vollständig."
    );
  }


  /*
   * XML V1 bewusst nur Kaufwohnung.
   *
   * Mietsemantik wird separat
   * gegen OpenImmo geprüft.
   */
  if (
    candidate.marketingType !==
    "KAUF"
  ) {

    addError(
      errors,
      "marketingType",
      "UNSUPPORTED_MARKETING_TYPE_V1",
      "OpenImmo XML V1 unterstützt zunächst ausschließlich Kaufobjekte."
    );
  }


  if (
    candidate.objectType !==
    "wohnung"
  ) {

    addError(
      errors,
      "objectType",
      "UNSUPPORTED_OBJECT_TYPE_V1",
      "OpenImmo XML V1 unterstützt zunächst ausschließlich Wohnungen."
    );
  }


  const company =
    clean(
      provider.company
    );

  const openImmoAnid =
    clean(
      provider.openImmoAnid
    );

  const contactName =
    clean(
      provider.contactName
    );

  const contactEmail =
    clean(
      provider.contactEmail
    );

  const contactPhone =
    clean(
      provider.contactPhone
    );


  if (!company) {

    addError(
      errors,
      "provider.company",
      "REQUIRED",
      "Anbieterfirma fehlt."
    );
  }


  /*
   * NICHT aus User-ID,
   * Verbindungs-ID oder
   * einer erfundenen Kennung ableiten.
   */
  if (!openImmoAnid) {

    addError(
      errors,
      "provider.openImmoAnid",
      "REQUIRED",
      "Eine echte OpenImmo Anbieter-ID fehlt."
    );
  }


  if (!contactName) {

    addError(
      errors,
      "provider.contactName",
      "REQUIRED",
      "Kontaktname fehlt."
    );
  }


  /*
   * Das XSD verlangt mindestens
   * einen Kontaktweg.
   *
   * V1 bevorzugt E-Mail.
   */
  if (
    !contactEmail &&
    !contactPhone
  ) {

    addError(
      errors,
      "provider.contact",
      "REQUIRED",
      "Mindestens E-Mail oder Telefonnummer der Kontaktperson fehlt."
    );
  }


  const referenceId =
    clean(
      candidate.referenceId
    );


  if (!referenceId) {

    addError(
      errors,
      "referenceId",
      "REQUIRED",
      "Objektreferenz fehlt."
    );
  }


  const standVom =
    dateOnly(
      updatedAt
    );


  if (!standVom) {

    addError(
      errors,
      "updatedAt",
      "REQUIRED",
      "Stand-vom Datum kann nicht erzeugt werden."
    );
  }


  const postalCode =
    clean(
      candidate
        .fields
        .geo
        .plz
    );

  const city =
    clean(
      candidate
        .fields
        .geo
        .ort
    );

  const street =
    clean(
      candidate
        .fields
        .geo
        .strasse
    );

  const streetNumber =
    clean(
      candidate
        .fields
        .geo
        .hausnummer
    );


  if (!postalCode) {

    addError(
      errors,
      "geo.plz",
      "REQUIRED",
      "Postleitzahl fehlt."
    );
  }


  if (!city) {

    addError(
      errors,
      "geo.ort",
      "REQUIRED",
      "Ort fehlt."
    );
  }


  const purchasePrice =
    decimal(
      candidate
        .fields
        .preise
        .kaufpreis
    );


  if (!purchasePrice) {

    addError(
      errors,
      "preise.kaufpreis",
      "REQUIRED",
      "Kaufpreis fehlt."
    );
  }


  const livingArea =
    decimal(
      candidate
        .fields
        .flaechen
        .wohnflaeche
    );

  const rooms =
    decimal(
      candidate
        .fields
        .flaechen
        .anzahl_zimmer
    );


  if (!livingArea) {

    addError(
      errors,
      "flaechen.wohnflaeche",
      "REQUIRED",
      "Wohnfläche fehlt."
    );
  }


  if (!rooms) {

    addError(
      errors,
      "flaechen.anzahl_zimmer",
      "REQUIRED",
      "Zimmeranzahl fehlt."
    );
  }


  const title =
    clean(
      candidate
        .fields
        .freitexte
        .objekttitel
    );

  const locationDescription =
    clean(
      candidate
        .fields
        .freitexte
        .lage
    );

  const equipment =
    clean(
      candidate
        .fields
        .freitexte
        .ausstatt_beschr
    );

  const description =
    clean(
      candidate
        .fields
        .freitexte
        .objektbeschreibung
    );


  if (errors.length > 0) {

    return {
      ready:
        false,

      standard:
        "OpenImmo",

      xmlVersion:
        "1.2.7",

      standardRelease:
        "1.2.7d",

      schemaValidated:
        false,

      immoweltProfileVerified:
        false,

      transportConfigured:
        false,

      networkTested:
        false,

      productionEnabled:
        false,

      errors,

      xml:
        null,
    };
  }


  /*
   * Ab hier sind diese Werte durch
   * die Guards oben garantiert.
   */
  const safeCompany =
    company!;

  const safeOpenImmoAnid =
    openImmoAnid!;

  const safeContactName =
    contactName!;

  const safeReferenceId =
    referenceId!;

  const safePostalCode =
    postalCode!;

  const safeCity =
    city!;

  const safeStandVom =
    standVom!;

  const safePurchasePrice =
    purchasePrice!;

  const safeLivingArea =
    livingArea!;

  const safeRooms =
    rooms!;


  const contactFirst =
    contactEmail
      ? (
          "<email_direkt>" +
          escapeXml(
            contactEmail
          ) +
          "</email_direkt>"
        )
      : (
          "<tel_zentrale>" +
          escapeXml(
            contactPhone!
          ) +
          "</tel_zentrale>"
        );


  /*
   * XSD Reihenfolge:
   *
   * objektkategorie
   * geo
   * kontaktperson
   * preise
   * flaechen
   * freitexte
   * verwaltung_techn
   */
  const xml =
    [
      '<?xml version="1.0" encoding="UTF-8"?>',

      "<openimmo>",

      (
        '<uebertragung' +
        ' art="ONLINE"' +
        ' umfang="TEIL"' +
        ' modus="NEW"' +
        ' version="1.2.7"' +
        ' sendersoftware="Inserat-AI"' +
        ' senderversion="1.0"' +
        " />"
      ),

      "<anbieter>",

      element(
        "firma",
        safeCompany
      ),

      element(
        "openimmo_anid",
        safeOpenImmoAnid
      ),

      "<immobilie>",

      "<objektkategorie>",

      (
        '<nutzungsart' +
        ' WOHNEN="true"' +
        ' GEWERBE="false"' +
        " />"
      ),

      (
        '<vermarktungsart' +
        ' KAUF="true"' +
        ' MIETE_PACHT="false"' +
        " />"
      ),

      "<objektart>",

      '<wohnung wohnungtyp="KEINE_ANGABE" />',

      "</objektart>",

      "</objektkategorie>",

      "<geo>",

      element(
        "plz",
        safePostalCode
      ),

      element(
        "ort",
        safeCity
      ),

      element(
        "strasse",
        street
      ),

      element(
        "hausnummer",
        streetNumber
      ),

      '<land iso_land="DEU" />',

      "</geo>",

      "<kontaktperson>",

      contactFirst,

      element(
        "name",
        safeContactName
      ),

      element(
        "firma",
        safeCompany
      ),

      "</kontaktperson>",

      "<preise>",

      element(
        "kaufpreis",
        safePurchasePrice
      ),

      '<waehrung iso_waehrung="EUR" />',

      "</preise>",

      "<flaechen>",

      element(
        "wohnflaeche",
        safeLivingArea
      ),

      element(
        "anzahl_zimmer",
        safeRooms
      ),

      "</flaechen>",

      "<freitexte>",

      element(
        "objekttitel",
        title
      ),

      element(
        "lage",
        locationDescription
      ),

      element(
        "ausstatt_beschr",
        equipment
      ),

      element(
        "objektbeschreibung",
        description
      ),

      "</freitexte>",

      "<verwaltung_techn>",

      element(
        "objektnr_intern",
        safeReferenceId
      ),

      element(
        "objektnr_extern",
        safeReferenceId
      ),

      /*
       * Laut OpenImmo:
       * Leeres <aktion /> bedeutet
       * neues Objekt / ADD.
       *
       * ADD ist KEIN erlaubter
       * aktionart Enum-Wert.
       */
      "<aktion />",

      element(
        "openimmo_obid",
        safeReferenceId
      ),

      element(
        "stand_vom",
        safeStandVom
      ),

      "</verwaltung_techn>",

      "</immobilie>",

      "</anbieter>",

      "</openimmo>",
    ]
      .filter(
        Boolean
      )
      .join(
        "\n"
      );


  return {
    ready:
      true,

    standard:
      "OpenImmo",

    xmlVersion:
      "1.2.7",

    standardRelease:
      "1.2.7d",

    /*
     * Erst NACH externer XSD-Prüfung
     * darf das Ergebnis als validiert
     * betrachtet werden.
     */
    schemaValidated:
      false,

    /*
     * OpenImmo-XSD-Kompatibilität
     * beweist noch NICHT das
     * immowelt-Partnerprofil.
     */
    immoweltProfileVerified:
      false,

    transportConfigured:
      false,

    networkTested:
      false,

    productionEnabled:
      false,

    errors:
      [],

    xml,
  };
}