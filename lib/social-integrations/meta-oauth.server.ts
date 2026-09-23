import "server-only";


export const META_REQUIRED_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
] as const;


export type MetaSocialEnvironment =
  | "test"
  | "production";


export type MetaOAuthConfig = {
  appId:
    string;

  appSecret:
    string;

  graphVersion:
    string;

  redirectUri:
    string;

  environment:
    MetaSocialEnvironment;
};


export type MetaOAuthToken = {
  accessToken:
    string;

  tokenType?:
    string;

  expiresIn?:
    number;
};


export type MetaManagedPage = {
  id:
    string;

  name:
    string;

  accessToken:
    string;

  tasks:
    string[];

  instagramBusinessAccountId:
    string |
    null;
};


function requiredEnv(
  name:
    string
):
  string {

  const value =
    process.env[
      name
    ]
      ?.trim();

  if (!value) {
    throw new Error(
      `${name} is not configured.`
    );
  }

  return value;
}


function cleanText(
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
    throw new Error(
      `${label} must be a string.`
    );
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${label} must not be empty.`
    );
  }

  return cleaned;
}


function getGraphVersion():
  string {

  const version =
    requiredEnv(
      "META_GRAPH_API_VERSION"
    );

  if (
    !/^v\d+\.\d+$/.test(
      version
    )
  ) {
    throw new Error(
      "META_GRAPH_API_VERSION must look like vXX.X."
    );
  }

  return version;
}


function getEnvironment():
  MetaSocialEnvironment {

  const raw =
    process.env
      .META_SOCIAL_ENVIRONMENT
      ?.trim() ||
    "test";

  if (
    raw !== "test" &&
    raw !== "production"
  ) {
    throw new Error(
      "META_SOCIAL_ENVIRONMENT must be test or production."
    );
  }

  return raw;
}


function resolveRedirectUri(
  requestOrigin:
    string
):
  string {

  const configured =
    process.env
      .META_OAUTH_REDIRECT_URI
      ?.trim();

  const value =
    configured ||
    `${requestOrigin}/api/social-connections/meta/oauth/callback`;

  const url =
    new URL(
      value
    );

  if (
    url.protocol !== "https:" &&
    url.protocol !== "http:"
  ) {
    throw new Error(
      "META OAuth redirect URI must use http or https."
    );
  }

  return url.toString();
}


export function getMetaOAuthConfig(
  input: {
    requestOrigin:
      string;
  }
):
  MetaOAuthConfig {

  return {
    appId:
      requiredEnv(
        "META_APP_ID"
      ),

    appSecret:
      requiredEnv(
        "META_APP_SECRET"
      ),

    graphVersion:
      getGraphVersion(),

    redirectUri:
      resolveRedirectUri(
        input.requestOrigin
      ),

    environment:
      getEnvironment(),
  };
}


export function isMetaOAuthConfigured():
  boolean {

  try {

    requiredEnv(
      "META_APP_ID"
    );

    requiredEnv(
      "META_APP_SECRET"
    );

    getGraphVersion();

    return true;
  }
  catch {

    return false;
  }
}


export function buildMetaAuthorizeUrl(
  input: {
    config:
      MetaOAuthConfig;

    state:
      string;
  }
):
  string {

  const state =
    cleanText(
      input.state,
      "OAuth state"
    );

  const url =
    new URL(
      `https://www.facebook.com/${input.config.graphVersion}/dialog/oauth`
    );

  url.searchParams.set(
    "client_id",
    input.config.appId
  );

  url.searchParams.set(
    "redirect_uri",
    input.config.redirectUri
  );

  url.searchParams.set(
    "state",
    state
  );

  url.searchParams.set(
    "response_type",
    "code"
  );

  url.searchParams.set(
    "scope",
    META_REQUIRED_SCOPES.join(
      ","
    )
  );

  return url.toString();
}


function providerErrorMessage(
  payload:
    unknown
):
  string {

  if (
    payload &&
    typeof payload ===
      "object" &&
    !Array.isArray(
      payload
    )
  ) {

    const record =
      payload as
        Record<
          string,
          unknown
        >;

    const error =
      record.error;

    if (
      error &&
      typeof error ===
        "object" &&
      !Array.isArray(
        error
      )
    ) {

      const message =
        (
          error as
            Record<
              string,
              unknown
            >
        ).message;

      if (
        typeof message ===
          "string" &&
        message.trim()
      ) {
        return message.trim();
      }
    }
  }

  return "Meta API request failed.";
}


export async function exchangeMetaAuthorizationCode(
  input: {
    config:
      MetaOAuthConfig;

    code:
      string;

    redirectUri:
      string;
  }
):
  Promise<
    MetaOAuthToken
  > {

  const code =
    cleanText(
      input.code,
      "Authorization code"
    );

  const redirectUri =
    cleanText(
      input.redirectUri,
      "Redirect URI"
    );


  const url =
    new URL(
      `https://graph.facebook.com/${input.config.graphVersion}/oauth/access_token`
    );

  url.searchParams.set(
    "client_id",
    input.config.appId
  );

  url.searchParams.set(
    "client_secret",
    input.config.appSecret
  );

  url.searchParams.set(
    "redirect_uri",
    redirectUri
  );

  url.searchParams.set(
    "code",
    code
  );


  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
      }
    );


  const payload:
    unknown =
    await response.json();


  if (
    !response.ok
  ) {
    throw new Error(
      providerErrorMessage(
        payload
      )
    );
  }


  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {
    throw new Error(
      "Meta returned an invalid OAuth token response."
    );
  }


  const record =
    payload as
      Record<
        string,
        unknown
      >;


  const accessToken =
    cleanText(
      record.access_token,
      "Meta access token"
    );


  const tokenType =
    typeof record.token_type ===
      "string"
      ? record.token_type.trim() ||
        undefined
      : undefined;


  const expiresIn =
    typeof record.expires_in ===
      "number" &&
    Number.isFinite(
      record.expires_in
    )
      ? record.expires_in
      : undefined;


  return {
    accessToken,
    tokenType,
    expiresIn,
  };
}


export async function exchangeMetaLongLivedUserToken(
  input: {
    config:
      MetaOAuthConfig;

    accessToken:
      string;
  }
):
  Promise<
    MetaOAuthToken
  > {

  const accessToken =
    cleanText(
      input.accessToken,
      "Meta access token"
    );


  const url =
    new URL(
      `https://graph.facebook.com/${input.config.graphVersion}/oauth/access_token`
    );


  url.searchParams.set(
    "grant_type",
    "fb_exchange_token"
  );

  url.searchParams.set(
    "client_id",
    input.config.appId
  );

  url.searchParams.set(
    "client_secret",
    input.config.appSecret
  );

  url.searchParams.set(
    "fb_exchange_token",
    accessToken
  );


  const response =
    await fetch(
      url,
      {
        method:
          "GET",

        cache:
          "no-store",

        headers: {
          Accept:
            "application/json",
        },
      }
    );


  const payload:
    unknown =
    await response.json();


  if (
    !response.ok
  ) {

    throw new Error(
      providerErrorMessage(
        payload
      )
    );
  }


  if (
    !payload ||
    typeof payload !==
      "object" ||
    Array.isArray(
      payload
    )
  ) {

    throw new Error(
      "Meta returned an invalid long-lived token response."
    );
  }


  const record =
    payload as
      Record<
        string,
        unknown
      >;


  const longLivedAccessToken =
    cleanText(
      record.access_token,
      "Meta long-lived access token"
    );


  const tokenType =
    typeof record.token_type ===
      "string"
      ? record.token_type.trim() ||
        undefined
      : undefined;


  const expiresIn =
    typeof record.expires_in ===
      "number" &&
    Number.isFinite(
      record.expires_in
    ) &&
    record.expires_in >
      0
      ? record.expires_in
      : undefined;




  return {
    accessToken:
      longLivedAccessToken,

    tokenType,

    expiresIn,
  };
}


type RawManagedPage = {
  id?:
    unknown;

  name?:
    unknown;

  access_token?:
    unknown;

  tasks?:
    unknown;

  instagram_business_account?:
    unknown;
};


function parseManagedPage(
  value:
    RawManagedPage
):
  MetaManagedPage {

  const id =
    cleanText(
      value.id,
      "Meta Page ID"
    );

  const name =
    cleanText(
      value.name,
      "Meta Page name"
    );

  const accessToken =
    cleanText(
      value.access_token,
      "Meta Page access token"
    );


  const tasks =
    Array.isArray(
      value.tasks
    )
      ? value.tasks
          .filter(
            (
              task
            ):
              task is string =>
                typeof task ===
                "string"
          )
          .map(
            (
              task
            ) =>
              task.trim()
          )
          .filter(
            Boolean
          )
      : [];


  let instagramBusinessAccountId:
    string |
    null =
      null;


  if (
    value.instagram_business_account &&
    typeof value.instagram_business_account ===
      "object" &&
    !Array.isArray(
      value.instagram_business_account
    )
  ) {

    const candidate =
      (
        value.instagram_business_account as
          Record<
            string,
            unknown
          >
      ).id;

    if (
      typeof candidate ===
        "string" &&
      candidate.trim()
    ) {
      instagramBusinessAccountId =
        candidate.trim();
    }
  }


  return {
    id,
    name,
    accessToken,
    tasks,
    instagramBusinessAccountId,
  };
}


export async function getMetaManagedPages(
  input: {
    config:
      MetaOAuthConfig;

    userAccessToken:
      string;
  }
):
  Promise<
    MetaManagedPage[]
  > {

  const userAccessToken =
    cleanText(
      input.userAccessToken,
      "Meta user access token"
    );


  const pages:
    MetaManagedPage[] =
      [];


  let after:
    string |
    null =
      null;


  for (
    let pageNumber = 0;
    pageNumber < 20;
    pageNumber += 1
  ) {

    const url =
      new URL(
        `https://graph.facebook.com/${input.config.graphVersion}/me/accounts`
      );

    url.searchParams.set(
      "fields",
      "id,name,access_token,tasks,instagram_business_account"
    );

    url.searchParams.set(
      "limit",
      "100"
    );

    if (after) {
      url.searchParams.set(
        "after",
        after
      );
    }


    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          cache:
            "no-store",

          headers: {
            Accept:
              "application/json",

            Authorization:
              `Bearer ${userAccessToken}`,
          },
        }
      );


    const payload:
      unknown =
      await response.json();


    if (
      !response.ok
    ) {
      throw new Error(
        providerErrorMessage(
          payload
        )
      );
    }


    if (
      !payload ||
      typeof payload !==
        "object" ||
      Array.isArray(
        payload
      )
    ) {
      throw new Error(
        "Meta returned an invalid Pages response."
      );
    }


    const record =
      payload as
        Record<
          string,
          unknown
        >;


    if (
      !Array.isArray(
        record.data
      )
    ) {
      throw new Error(
        "Meta Pages response does not contain a data array."
      );
    }


    for (
      const item of
      record.data
    ) {

      if (
        !item ||
        typeof item !==
          "object" ||
        Array.isArray(
          item
        )
      ) {
        continue;
      }

      pages.push(
        parseManagedPage(
          item as
            RawManagedPage
        )
      );
    }


    after =
      null;


    if (
      record.paging &&
      typeof record.paging ===
        "object" &&
      !Array.isArray(
        record.paging
      )
    ) {

      const cursors =
        (
          record.paging as
            Record<
              string,
              unknown
            >
        ).cursors;


      if (
        cursors &&
        typeof cursors ===
          "object" &&
        !Array.isArray(
          cursors
        )
      ) {

        const nextAfter =
          (
            cursors as
              Record<
                string,
                unknown
              >
          ).after;

        if (
          typeof nextAfter ===
            "string" &&
          nextAfter.trim()
        ) {
          after =
            nextAfter.trim();
        }
      }
    }


    if (!after) {
      break;
    }
  }


  return pages;
}