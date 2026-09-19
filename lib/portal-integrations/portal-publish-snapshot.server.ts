import "server-only";

import type {
  PrismaPortalListingInput,
} from "./prisma-listing-adapter";


export type PortalPublishSnapshotErrorCode =
  | "PORTAL_SNAPSHOT_MISSING"
  | "PORTAL_SNAPSHOT_INVALID"
  | "PORTAL_SNAPSHOT_SCHEMA_UNSUPPORTED"
  | "PORTAL_SNAPSHOT_TARGET_MISMATCH";


export class PortalPublishSnapshotError
  extends Error {

  readonly code:
    PortalPublishSnapshotErrorCode;


  constructor(
    code:
      PortalPublishSnapshotErrorCode,
    message:
      string
  ) {

    super(
      message
    );

    this.name =
      "PortalPublishSnapshotError";

    this.code =
      code;
  }
}


export type DecodedPortalPublishSnapshotV1 = {
  schemaVersion:
    1;

  market:
    string;

  target: {
    portal:
      string;

    provider:
      string;

    environment:
      string;
  };

  listing:
    PrismaPortalListingInput;
};


function fail(
  code:
    PortalPublishSnapshotErrorCode,
  message:
    string
):
  never {

  throw new PortalPublishSnapshotError(
    code,
    message
  );
}


function isRecord(
  value:
    unknown
):
  value is
    Record<
      string,
      unknown
    > {

  return (
    value !==
      null &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value
    )
  );
}


function requiredRecord(
  value:
    unknown,
  label:
    string
):
  Record<
    string,
    unknown
  > {

  if (
    !isRecord(
      value
    )
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      `${label} fehlt oder ist ungültig.`
    );
  }

  return value;
}


function requiredString(
  value:
    unknown,
  label:
    string
):
  string {

  if (
    typeof value !==
      "string"
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      `${label} fehlt oder ist ungültig.`
    );
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      `${label} darf nicht leer sein.`
    );
  }

  return cleaned;
}


function optionalString(
  value:
    unknown
):
  string |
  null {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    typeof value !==
      "string"
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      "Optionaler Textwert ist ungültig."
    );
  }

  return value.trim() ||
    null;
}


function optionalNumber(
  value:
    unknown
):
  number |
  null {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  if (
    typeof value !==
      "number" ||
    !Number.isFinite(
      value
    )
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      "Optionaler Zahlenwert ist ungültig."
    );
  }

  return value;
}


function requiredDate(
  value:
    unknown,
  label:
    string
):
  Date {

  const raw =
    requiredString(
      value,
      label
    );

  const date =
    new Date(
      raw
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      `${label} ist kein gültiges Datum.`
    );
  }

  return date;
}


function decodeImages(
  value:
    unknown
):
  PrismaPortalListingInput["images"] {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return [];
  }

  if (
    !Array.isArray(
      value
    )
  ) {
    fail(
      "PORTAL_SNAPSHOT_INVALID",
      "listing.images ist ungültig."
    );
  }

  return value.map(
    (
      item,
      index
    ) => {

      const image =
        requiredRecord(
          item,
          `listing.images[${index}]`
        );

      return {
        url:
          requiredString(
            image.url,
            `listing.images[${index}].url`
          ),

        fileName:
          optionalString(
            image.fileName
          ),

        mimeType:
          optionalString(
            image.mimeType
          ),
      };
    }
  );
}


function decodeFinance(
  value:
    unknown
):
  PrismaPortalListingInput["finance"] {

  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const finance =
    requiredRecord(
      value,
      "listing.finance"
    );

  return {
    marketingType:
      optionalString(
        finance.marketingType
      ),

    askingPrice:
      optionalNumber(
        finance.askingPrice
      ),

    commissionRate:
      optionalNumber(
        finance.commissionRate
      ),

    netRentMonthly:
      optionalNumber(
        finance.netRentMonthly
      ),

    additionalCostsMonthly:
      optionalNumber(
        finance.additionalCostsMonthly
      ),

    heatingCostsMonthly:
      optionalNumber(
        finance.heatingCostsMonthly
      ),
  };
}


export function decodePortalPublishListingSnapshot(
  input: {
    payloadSnapshot:
      unknown;

    expectedPortal?:
      string;

    expectedProvider?:
      string;

    expectedListingId?:
      string;

    expectedEnvironment?:
      string;

    expectedMarket?:
      string;
  }
):
  DecodedPortalPublishSnapshotV1 {

  if (
    input.payloadSnapshot ===
      null ||
    input.payloadSnapshot ===
      undefined
  ) {
    fail(
      "PORTAL_SNAPSHOT_MISSING",
      "Portal-Publish-Snapshot fehlt."
    );
  }


  const root =
    requiredRecord(
      input.payloadSnapshot,
      "payloadSnapshot"
    );


  if (
    root.schemaVersion !==
      1
  ) {
    fail(
      "PORTAL_SNAPSHOT_SCHEMA_UNSUPPORTED",
      "Portal-Publish-Snapshot-Version wird nicht unterstützt."
    );
  }


  const market =
    requiredString(
      root.market,
      "market"
    )
      .toUpperCase();


  const target =
    requiredRecord(
      root.target,
      "target"
    );

  const portal =
    requiredString(
      target.portal,
      "target.portal"
    );

  const provider =
    requiredString(
      target.provider,
      "target.provider"
    );

  const environment =
    requiredString(
      target.environment,
      "target.environment"
    );


  if (
    input.expectedPortal &&
    portal !==
      input.expectedPortal
  ) {
    fail(
      "PORTAL_SNAPSHOT_TARGET_MISMATCH",
      "Snapshot-Portal stimmt nicht mit dem Job überein."
    );
  }


  if (
    input.expectedProvider &&
    provider !==
      input.expectedProvider
  ) {
    fail(
      "PORTAL_SNAPSHOT_TARGET_MISMATCH",
      "Snapshot-Provider stimmt nicht mit dem Job überein."
    );
  }


  if (
    input.expectedEnvironment &&
    environment !==
      input.expectedEnvironment
  ) {
    fail(
      "PORTAL_SNAPSHOT_TARGET_MISMATCH",
      "Snapshot-Environment stimmt nicht mit dem Job überein."
    );
  }


  if (
    input.expectedMarket &&
    market !==
      input.expectedMarket
        .trim()
        .toUpperCase()
  ) {
    fail(
      "PORTAL_SNAPSHOT_TARGET_MISMATCH",
      "Snapshot-Markt stimmt nicht mit dem erwarteten Markt überein."
    );
  }


  const listing =
    requiredRecord(
      root.listing,
      "listing"
    );


  const id =
    requiredString(
      listing.id,
      "listing.id"
    );

  if (
    input.expectedListingId &&
    id !==
      input.expectedListingId
  ) {
    fail(
      "PORTAL_SNAPSHOT_TARGET_MISMATCH",
      "Snapshot-Listing stimmt nicht mit dem Job überein."
    );
  }


  const location =
    requiredString(
      listing.location,
      "listing.location"
    );

  const propertyType =
    requiredString(
      listing.propertyType,
      "listing.propertyType"
    );

  const createdAt =
    requiredDate(
      listing.createdAt,
      "listing.createdAt"
    );

  const updatedAt =
    requiredDate(
      listing.updatedAt,
      "listing.updatedAt"
    );


  const listingMarket =
    optionalString(
      listing.market
    ) ??
    market;


  return {
    schemaVersion:
      1,

    market,

    target: {
      portal,
      provider,
      environment,
    },

    listing: {
      id,

      projectName:
        optionalString(
          listing.projectName
        ),

      street:
        optionalString(
          listing.street
        ),

      location,

      postalCode:
        optionalString(
          listing.postalCode
        ),

      latitude:
        optionalNumber(
          listing.latitude
        ),

      longitude:
        optionalNumber(
          listing.longitude
        ),

      market:
        listingMarket,

      countryCode:
        optionalString(
          listing.countryCode
        ),

      propertyType,

      rooms:
        optionalNumber(
          listing.rooms
        ),

      livingArea:
        optionalNumber(
          listing.livingArea
        ),

      price:
        optionalNumber(
          listing.price
        ),

      highlights:
        optionalString(
          listing.highlights
        ),

      generatedVariants:
        optionalString(
          listing.generatedVariants
        ),

      locationDescription:
        optionalString(
          listing.locationDescription
        ),

      archivedAt:
        null,

      createdAt,

      updatedAt,

      images:
        decodeImages(
          listing.images
        ),

      finance:
        decodeFinance(
          listing.finance
        ),
    },
  };
}
