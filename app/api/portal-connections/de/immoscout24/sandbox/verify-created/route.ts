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


type VerifyResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;
};


function readSandboxObject(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
):
  Promise<VerifyResult> {

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
      `([^<]*)` +
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


function extractPublishChannels(
  xml:
    string
):
  Array<{
    id:
      string;

    title:
      string;
  }> {

  const result:
    Array<{
      id:
        string;

      title:
        string;
    }> =
    [];

  const pattern =
    /<publishChannel\b[^>]*\bid="([^"]+)"[^>]*\btitle="([^"]*)"[^>]*\/?>/gi;

  let match:
    RegExpExecArray | null;

  while (
    (
      match =
        pattern.exec(
          xml
        )
    ) !==
    null
  ) {

    result.push({
      id:
        match[1],

      title:
        match[2],
    });
  }

  return result;
}


export async function GET(
  request: NextRequest
) {

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


    const externalId =
      request.nextUrl
        .searchParams
        .get(
          "externalId"
        )
        ?.trim() ??
      "";


    /*
     * Nur unsere eigenen isolierten
     * Sandbox-Testobjekte dürfen über
     * diese Route abgefragt werden.
     */
    if (
      !/^sbx-[A-Za-z0-9_-]+$/.test(
        externalId
      ) ||
      externalId.length >
        50
    ) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            "INVALID_SANDBOX_EXTERNAL_ID",

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


    const resourceUrl =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/realestate/` +
      `ext-${encodeURIComponent(
        externalId
      )}`;


    const upstream =
      await readSandboxObject({
        url:
          resourceUrl,

        accessToken:
          access.accessToken,

        accessTokenSecret:
          access.accessTokenSecret,
      });


    if (!upstream.ok) {

      return NextResponse.json(
        {
          success:
            false,

          error:
            upstream.statusCode ===
              404
              ? "SANDBOX_OBJECT_NOT_FOUND"
              : "IMMOSCOUT24_SANDBOX_VERIFY_FAILED",

          upstreamStatus:
            upstream.statusCode,

          objectVerified:
            false,

          productionEnabled:
            false,

          publishEnabled:
            false,
        },
        {
          status:
            upstream.statusCode ===
              404
              ? 404
              : 502,
        }
      );
    }


    const returnedExternalId =
      extractTag(
        upstream.raw,
        "externalId"
      );

    const realEstateId =
      extractRealEstateId(
        upstream.raw
      );

    const title =
      extractTag(
        upstream.raw,
        "title"
      );

    const state =
      extractTag(
        upstream.raw,
        "realEstateState"
      );

    const publishChannels =
      extractPublishChannels(
        upstream.raw
      );


    const externalIdMatches =
      returnedExternalId ===
      externalId;

    const objectVerified =
      externalIdMatches &&
      Boolean(
        realEstateId
      );


    const publishedToImmoScout24 =
      publishChannels.some(
        (
          channel
        ) =>
          channel.id ===
            "10000" ||
          /immobilienscout24/i.test(
            channel.title
          )
      );


    return NextResponse.json({
      success:
        true,

      environment:
        "sandbox",

      objectVerified,

      externalIdMatches,

      externalId:
        returnedExternalId,

      realEstateId,

      title,

      realEstateState:
        state,

      publishChannels,

      publishedToImmoScout24,

      upstreamStatus:
        upstream.statusCode,

      responseBodyReturned:
        false,

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
      "[immoscout24-de] sandbox verify failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "IMMOSCOUT24_SANDBOX_VERIFY_FAILED",

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