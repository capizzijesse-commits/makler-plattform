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


type ReadResult = {
  ok:
    boolean;

  statusCode:
    number;

  raw:
    string;
};


function readPublishChannels(
  input: {
    url:
      string;

    accessToken:
      string;

    accessTokenSecret:
      string;
  }
):
  Promise<ReadResult> {

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
            typeof data === "string"
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


function extractAttribute(
  tag:
    string,
  name:
    string
):
  string | null {

  const pattern =
    new RegExp(
      `\\b${name}="([^"]*)"`,
      "i"
    );

  return (
    tag.match(
      pattern
    )?.[1]
      ?.trim() ??
    null
  );
}


function extractChannels(
  xml:
    string
) {

  const tags =
    xml.match(
      /<(?:[A-Za-z0-9_-]+:)?publishChannel\b[^>]*\/?>/gi
    ) ??
    [];


  return tags
    .map(
      (
        tag
      ) => {

        const id =
          extractAttribute(
            tag,
            "id"
          );

        const title =
          extractAttribute(
            tag,
            "title"
          );


        if (!id) {
          return null;
        }


        return {
          id,
          title,
        };
      }
    )
    .filter(
      (
        value
      ): value is {
        id:
          string;

        title:
          string | null;
      } =>
        value !==
        null
    );
}


export async function GET(
  request:
    NextRequest
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


    const url =
      `${config.baseUrl}` +
      `/restapi/api/offer/v1.0/user/me/publishchannel`;


    const upstream =
      await readPublishChannels({
        url,

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
            "PUBLISH_CHANNEL_READ_FAILED",

          upstreamStatus:
            upstream.statusCode,

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


    const channels =
      extractChannels(
        upstream.raw
      );


    const immoScout24Channel =
      channels.find(
        (
          channel
        ) =>
          channel.id ===
          "10000"
      ) ??
      null;


    return NextResponse.json({
      success:
        true,

      environment:
        "sandbox",

      channels,

      immoScout24ChannelAvailable:
        Boolean(
          immoScout24Channel
        ),

      immoScout24Channel,

      upstreamStatus:
        upstream.statusCode,

      requestMethod:
        "GET",

      databaseModified:
        false,

      objectModified:
        false,

      publishRequestSent:
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
      "[immoscout24-de] sandbox publish-channel check failed",
      error
    );


    return NextResponse.json(
      {
        success:
          false,

        error:
          "PUBLISH_CHANNEL_CHECK_FAILED",

        databaseModified:
          false,

        objectModified:
          false,

        publishRequestSent:
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