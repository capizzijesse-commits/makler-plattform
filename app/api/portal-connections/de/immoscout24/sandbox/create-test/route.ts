import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  mapPrismaListingToPortal,
} from "@/lib/portal-integrations/prisma-listing-adapter";

import {
  buildImmoScout24DeApartmentBuyDryRun,
} from "@/lib/portal-integrations/immoscout24-de-payload.server";

import {
  createImmoScout24DeOAuthClient,
  getImmoScout24DeOAuthConfig,
} from "@/lib/portal-integrations/immoscout24-de-oauth.server";

import {
  getImmoScout24DeSandboxAccess,
} from "@/lib/portal-integrations/immoscout24-de-oauth-flow.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


const REQUIRED_CONFIRMATION =
  "CREATE_IMMOSCOUT24_SANDBOX_OBJECT";


function isSameOrigin(
  request: NextRequest
):
  boolean {

  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return false;
  }

  try {

    return (
      new URL(
        origin
      ).origin ===
      request.nextUrl.origin
    );
  }
  catch {
    return false;
  }
}


function extractXmlTag(
  input:
    string,
  tag:
    string
):
  string | null {

  const escapedTag =
    tag.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  const pattern =
    new RegExp(
      `<(?:[A-Za-z0-9_-]+:)?${escapedTag}>` +
      `([^<]*)` +
      `</(?:[A-Za-z0-9_-]+:)?${escapedTag}>`,
      "i"
    );

  const match =
    input.match(
      pattern
    );

  return (
    match?.[1]
      ?.trim() ||
    null
  );
}


type UpstreamResult = {
  ok:
    boolean;

  statusCode:
    number;

  realEstateId:
    string | null;

  messageCode:
    string | null;

  message:
    string | null;
};


function createSandboxRealEstate(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;

    xml:
      string;
  }
):
  Promise<UpstreamResult> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve
    ) => {

      client.post(
        input.url,
        input.accessToken,
        input.accessTokenSecret,
        input.xml,
        "application/xml",
        (
          error,
          data,
          response
        ) => {

          const raw =
            typeof data ===
            "string"
              ? data
              : "";

          if (error) {

            const errorRaw =
              typeof error.data ===
              "string"
                ? error.data
                : raw;

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode ===
                "number"
                  ? error.statusCode
                  : 502,

              realEstateId:
                extractXmlTag(
                  errorRaw,
                  "realEstateId"
                ),

              messageCode:
                extractXmlTag(
                  errorRaw,
                  "messageCode"
                ),

              message:
                extractXmlTag(
                  errorRaw,
                  "message"
                ),
            });

            return;
          }


          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            realEstateId:
              extractXmlTag(
                raw,
                "realEstateId"
              ),

            messageCode:
              extractXmlTag(
                raw,
                "messageCode"
              ),

            message:
              extractXmlTag(
                raw,
                "message"
              ),
          });
        }
      );
    }
  );
}


export async function POST(
  request: NextRequest
) {

  /*
   * Externer mutierender Request:
   * fail-closed Same-Origin.
   */
  if (
    !isSameOrigin(
      request
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "INVALID_REQUEST_ORIGIN",

        publishEnabled:
          false,
      },
      {
        status:
          403,
      }
    );
  }


  const user =
    await getAuthenticatedUser(
      request
    );


  if (!user) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "UNAUTHORIZED",

        publishEnabled:
          false,
      },
      {
        status:
          401,
      }
    );
  }


  try {

    const config =
      getImmoScout24DeOAuthConfig();


    /*
     * Doppelte harte Sandbox-Sperre.
     */
    if (
      config.environment !==
        "sandbox" ||
      config.baseUrl !==
        "https://rest.sandbox-immobilienscout24.de"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_ONLY",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    let body:
      Record<string, unknown>;

    try {

      const parsed:
        unknown =
        await request.json();

      if (
        !parsed ||
        typeof parsed !==
          "object" ||
        Array.isArray(
          parsed
        )
      ) {

        throw new Error(
          "INVALID_BODY"
        );
      }

      body =
        parsed as
          Record<string, unknown>;
    }
    catch {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_JSON_BODY",

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    const listingId =
      typeof body.listingId ===
        "string"
        ? body.listingId.trim()
        : "";


    const confirmation =
      typeof body.confirmation ===
        "string"
        ? body.confirmation.trim()
        : "";


    const useSandboxTestAddress =
      body.useSandboxTestAddress ===
      true;


    if (!listingId) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "LISTING_ID_REQUIRED",

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * Der erste echte Netzwerk-Test
     * muss eine explizite Bestätigung
     * enthalten.
     */
    if (
      confirmation !==
      REQUIRED_CONFIRMATION
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_CREATE_CONFIRMATION_REQUIRED",

          requiredConfirmation:
            REQUIRED_CONFIRMATION,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    /*
     * Kein echtes Objekt darf für diesen
     * isolierten Test mit seiner echten
     * Adresse übertragen werden.
     */
    if (
      !useSandboxTestAddress
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_TEST_ADDRESS_REQUIRED",

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    const access =
      getImmoScout24DeSandboxAccess(
        user.id
      );


    if (!access) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "TEMPORARY_OAUTH_ACCESS_REQUIRED",

          environment:
            "sandbox",

          publishEnabled:
            false,
        },
        {
          status:
            409,
        }
      );
    }


    const listing =
      await prisma.listing.findFirst({
        where: {
          id:
            listingId,

          userId:
            user.id,

          archivedAt:
            null,

          countryCode:
            "DE",
        },

        include: {
          finance:
            true,

          images: {
            orderBy: [
              {
                isPrimary:
                  "desc",
              },
              {
                position:
                  "asc",
              },
              {
                createdAt:
                  "asc",
              },
            ],
          },
        },
      });


    if (!listing) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "DE_LISTING_NOT_FOUND",

          publishEnabled:
            false,
        },
        {
          status:
            404,
        }
      );
    }


    const normalized =
      mapPrismaListingToPortal(
        listing,
        "de"
      );


    /*
     * Einzigartige Sandbox-External-ID,
     * damit Wiederholungstests nicht mit
     * bestehenden Testobjekten kollidieren.
     */
    const sandboxExternalId =
      (
        "sbx-" +
        listing.id +
        "-" +
        Date.now()
          .toString(
            36
          )
      ).slice(
        0,
        50
      );


    const normalizedForSandbox = {
      ...normalized,

      referenceId:
        sandboxExternalId,

      address: {
        ...normalized.address,

        street:
          "Invalidenstrasse",

        streetNumber:
          "65",

        postalCode:
          "10557",

        locality:
          "Berlin",

        countryCode:
          "DE",
      },
    };


    const payload =
      buildImmoScout24DeApartmentBuyDryRun({
        listing:
          normalizedForSandbox,

        commissionRate:
          listing.finance
            ?.commissionRate ??
          null,
      });


    if (
      !payload.ready ||
      !payload.xml
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_PAYLOAD_NOT_READY",

          validationErrors:
            payload.errors,

          sourceTransferEligible:
            listing.unlockStatus ===
              "paid" ||
            listing.unlockStatus ===
              "included",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            422,
        }
      );
    }


    const createUrl =
      `${config.baseUrl}/restapi/api/offer/v1.0/user/me/realestate/`;


    const upstream =
      await createSandboxRealEstate({
        url:
          createUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,

        xml:
          payload.xml,
      });


    if (!upstream.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "IMMOSCOUT24_SANDBOX_CREATE_REJECTED",

          environment:
            "sandbox",

          upstreamStatus:
            upstream.statusCode,

          upstreamMessageCode:
            upstream.messageCode,

          upstreamMessage:
            upstream.message
              ?.slice(
                0,
                300
              ) ??
            null,

          objectCreated:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            502,
        }
      );
    }


    /*
     * WICHTIG:
     * Dieser Endpoint erzeugt nur das
     * deaktivierte Sandbox-Objekt.
     *
     * Es gibt hier keinen Publish-Request.
     */
    return NextResponse.json({
      success:
        true,

      environment:
        "sandbox",

      objectCreated:
        true,

      objectPublished:
        false,

      realEstateId:
        upstream.realEstateId,

      externalId:
        sandboxExternalId,

      upstreamStatus:
        upstream.statusCode,

      upstreamMessageCode:
        upstream.messageCode,

      sourceUnlockStatus:
        listing.unlockStatus,

      sourceTransferEligible:
        listing.unlockStatus ===
          "paid" ||
        listing.unlockStatus ===
          "included",

      sandboxTestAddressApplied:
        true,

      databaseModified:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] sandbox create test failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_SANDBOX_CREATE_TEST_FAILED",

        productionEnabled:
          false,

        publishEnabled:
          false,
      },
      {
        status:
          500,
      }
    );
  }
}