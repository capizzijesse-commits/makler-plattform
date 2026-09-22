import "server-only";


export const LINKEDIN_TEXT_POST_MAX_LENGTH =
  3000;

export const LINKEDIN_SELF_SERVE_UGC_ENDPOINT =
  "https://api.linkedin.com/v2/ugcPosts";


export type LinkedInTextShareDryRun = {
  endpoint:
    typeof LINKEDIN_SELF_SERVE_UGC_ENDPOINT;

  method:
    "POST";

  authorIdentitySource:
    "oidc_sub_candidate";

  captionLength:
    number;

  body: {
    author:
      string;

    lifecycleState:
      "PUBLISHED";

    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: {
          text:
            string;
        };

        shareMediaCategory:
          "NONE";
      };
    };

    visibility: {
      "com.linkedin.ugc.MemberNetworkVisibility":
        "PUBLIC";
    };
  };
};


function requiredText(
  value:
    string,
  label:
    string
):
  string {

  const cleaned =
    value.trim();


  if (!cleaned) {
    throw new Error(
      `${label} must not be empty.`
    );
  }


  return cleaned;
}


export function buildLinkedInTextShareDryRun(
  input: {
    oidcSubject:
      string;

    caption:
      string;
  }
):
  LinkedInTextShareDryRun {

  const oidcSubject =
    requiredText(
      input.oidcSubject,
      "LinkedIn OIDC subject"
    );


  const caption =
    requiredText(
      input.caption,
      "LinkedIn caption"
    );


  if (
    caption.length >
    LINKEDIN_TEXT_POST_MAX_LENGTH
  ) {
    throw new Error(
      "LINKEDIN_CAPTION_TOO_LONG"
    );
  }


  /*
   * LinkedIn Self-Serve Share verlangt
   * einen Person URN.
   *
   * Beim modernen OIDC-Flow erhalten wir
   * den app-spezifischen Subject-Identifier.
   *
   * Bis der erste explizit freigegebene
   * echte Test-Post diesen Identifier
   * bestätigt, behandeln wir ihn bewusst
   * als KANDIDAT und führen hier keinerlei
   * Provider-Aufruf aus.
   */
  const author =
    `urn:li:person:${oidcSubject}`;


  return {
    endpoint:
      LINKEDIN_SELF_SERVE_UGC_ENDPOINT,

    method:
      "POST",

    authorIdentitySource:
      "oidc_sub_candidate",

    captionLength:
      caption.length,

    body: {
      author,

      lifecycleState:
        "PUBLISHED",

      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text:
              caption,
          },

          shareMediaCategory:
            "NONE",
        },
      },

      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility":
          "PUBLIC",
      },
    },
  };
}
