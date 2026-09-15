import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

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


const SANDBOX_BASE_URL =
  "https://rest.sandbox-immobilienscout24.de";

const EXPECTED_EXTERNAL_ID =
  "sbx-cmtsovrsh0003w5mo4va9ca9a-mu2vqbkh";

const EXPECTED_REAL_ESTATE_ID =
  "325452819";

const CONFIRMATION =
  "UPDATE_IMMOSCOUT24_SANDBOX_OBJECT_325452819";

const UPDATE_TITLE =
  "Inserat-AI Sandbox Update Test 325452819";


type OAuthResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;
};


function sameOrigin(
  request:
    NextRequest
):
  boolean {

  const origin =
    request.headers
      .get(
        "origin"
      )
      ?.trim();

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


function xmlEscape(
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


function extractTag(
  xml:
    string,
  tag:
    string
):
  string | null {

  const pattern =
    new RegExp(
      `<(?:[A-Za-z0-9_-]+:)?${tag}>` +
      `([\\s\\S]*?)` +
      `</(?:[A-Za-z0-9_-]+:)?${tag}>`,
      "i"
    );

  return (
    xml.match(
      pattern
    )?.[1]
      ?.trim() ??
    null
  );
}


function extractRealEstateId(
  xml:
    string
):
  string | null {

  const match =
    xml.match(
      /<realestates:[A-Za-z0-9_-]+\b[^>]*\bid="([^"]+)"/i
    );

  return (
    match?.[1]
      ?.trim() ??
    null
  );
}


function replaceTitle(
  xml:
    string,
  title:
    string
):
  string {

  const pattern =
    /<(?:[A-Za-z0-9_-]+:)?title>[\s\S]*?<\/(?:[A-Za-z0-9_-]+:)?title>/i;

  if (
    !pattern.test(
      xml
    )
  ) {

    throw new Error(
      "TITLE_ELEMENT_NOT_FOUND"
    );
  }


  return xml.replace(
    pattern,
    `<title>${xmlEscape(
      title
    )}</title>`
  );
}


function oauthGet(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
):
  Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve
    ) => {

      client.get(
        input.url,
        input.accessToken,
        input.accessTokenSecret,
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

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode ===
                "number"
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,
            });

            return;
          }


          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            raw,
          });
        }
      );
    }
  );
}


function oauthPut(
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
  Promise<OAuthResult> {

  const client =
    createImmoScout24DeOAuthClient();

  return new Promise(
    (
      resolve
    ) => {

      client.put(
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

            resolve({
              ok:
                false,

              statusCode:
                typeof error.statusCode ===
                "number"
                  ? error.statusCode
                  : 502,

              raw:
                typeof error.data ===
                "string"
                  ? error.data
                  : raw,
            });

            return;
          }


          resolve({
            ok:
              true,

            statusCode:
              response?.statusCode ??
              200,

            raw,
          });
        }
      );
    }
  );
}


export async function POST(
  request:
    NextRequest
) {

  /*
   * Mutation:
   * deshalb Same-Origin fail-closed.
   */
  if (
    !sameOrigin(
      request
    )
  ) {

    return NextResponse.json(
      {
        success:
          false,

        error:
          "SAME_ORIGIN_REQUIRED",

        productionEnabled:
          false,

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

        productionEnabled:
          false,

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
     * Hard gate:
     * niemals Production.
     */
    if (
      config.environment !==
        "sandbox" ||
      config.baseUrl !==
        SANDBOX_BASE_URL
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
      unknown;

    try {

      body =
        await request.json();
    }
    catch {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_JSON",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(
        body
      )
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_BODY",

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            400,
        }
      );
    }


    const candidate =
      body as
        Record<
          string,
          unknown
        >;


    if (
      candidate.confirmation !==
      CONFIRMATION
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "EXPLICIT_CONFIRMATION_REQUIRED",

          expectedConfirmation:
            CONFIRMATION,

          productionEnabled:
            false,

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
      await getImmoScout24DeSandboxAccess(
        user.id
      );


    if (!access) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "OAUTH_ACCESS_REQUIRED",

          environment:
            "sandbox",

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


    /*
     * Diese V1 Route darf exakt EIN
     * bereits von uns erzeugtes
     * Sandbox-Objekt anfassen.
     */
    const resourceUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/realestate/` +
      `ext-${encodeURIComponent(
        EXPECTED_EXTERNAL_ID
      )}`;


    /*
     * Erst vollständiges Objekt lesen.
     *
     * ImmoScout24 verlangt beim PUT
     * den vollständigen Objektinhalt.
     */
    const before =
      await oauthGet({
        url:
          resourceUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!before.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_READ_FAILED",

          upstreamStatus:
            before.statusCode,

          objectUpdated:
            false,

          databaseModified:
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


    const beforeExternalId =
      extractTag(
        before.raw,
        "externalId"
      );

    const beforeRealEstateId =
      extractRealEstateId(
        before.raw
      );

    const beforeState =
      extractTag(
        before.raw,
        "realEstateState"
      );

    const beforeTitle =
      extractTag(
        before.raw,
        "title"
      );


    /*
     * Fail closed:
     * falsches Objekt oder bereits
     * aktives/veröffentlichtes Objekt
     * wird NICHT verändert.
     */
    if (
      beforeExternalId !==
        EXPECTED_EXTERNAL_ID ||
      beforeRealEstateId !==
        EXPECTED_REAL_ESTATE_ID
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_IDENTITY_MISMATCH",

          objectUpdated:
            false,

          databaseModified:
            false,

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


    if (
      beforeState !==
      "INACTIVE"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "SANDBOX_OBJECT_NOT_INACTIVE",

          realEstateState:
            beforeState,

          objectUpdated:
            false,

          databaseModified:
            false,

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


    /*
     * Nur Titel ändern.
     * Alle übrigen vom GET gelieferten
     * Attribute bleiben erhalten.
     */
    const updatedXml =
      replaceTitle(
        before.raw,
        UPDATE_TITLE
      );


    const upstream =
      await oauthPut({
        url:
          resourceUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,

        xml:
          updatedXml,
      });


    if (!upstream.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "IMMOSCOUT24_SANDBOX_UPDATE_FAILED",

          upstreamStatus:
            upstream.statusCode,

          objectUpdated:
            false,

          databaseModified:
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


    const messageCode =
      extractTag(
        upstream.raw,
        "messageCode"
      );


    if (
      messageCode !==
      "MESSAGE_RESOURCE_UPDATED"
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "UNEXPECTED_UPDATE_RESPONSE",

          upstreamStatus:
            upstream.statusCode,

          upstreamMessageCode:
            messageCode,

          objectUpdated:
            false,

          databaseModified:
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
     * Unmittelbarer Read-back.
     */
    const after =
      await oauthGet({
        url:
          resourceUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!after.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "UPDATE_READBACK_FAILED",

          upstreamStatus:
            after.statusCode,

          objectUpdated:
            true,

          readBackVerified:
            false,

          databaseModified:
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


    const afterExternalId =
      extractTag(
        after.raw,
        "externalId"
      );

    const afterRealEstateId =
      extractRealEstateId(
        after.raw
      );

    const afterState =
      extractTag(
        after.raw,
        "realEstateState"
      );

    const afterTitle =
      extractTag(
        after.raw,
        "title"
      );


    const readBackVerified =
      afterExternalId ===
        EXPECTED_EXTERNAL_ID &&
      afterRealEstateId ===
        EXPECTED_REAL_ESTATE_ID &&
      afterState ===
        "INACTIVE" &&
      afterTitle ===
        UPDATE_TITLE;


    return NextResponse.json({
      success:
        readBackVerified,

      environment:
        "sandbox",

      objectUpdated:
        true,

      readBackVerified,

      externalId:
        afterExternalId,

      realEstateId:
        afterRealEstateId,

      titleBefore:
        beforeTitle,

      titleAfter:
        afterTitle,

      realEstateState:
        afterState,

      upstreamStatus:
        upstream.statusCode,

      upstreamMessageCode:
        messageCode,

      fullObjectPreserved:
        true,

      secondObjectCreated:
        false,

      publishEndpointCalled:
        false,

      databaseModified:
        false,

      responseBodyReturned:
        false,

      productionEnabled:
        false,

      publishEnabled:
        false,
    });
  }
  catch (error) {

    console.error(
      "[immoscout24-de] sandbox update test failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_SANDBOX_UPDATE_FAILED",

        objectUpdated:
          false,

        databaseModified:
          false,

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