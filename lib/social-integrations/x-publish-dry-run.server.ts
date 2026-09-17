import "server-only";

export const X_TEXT_POST_MAX_LENGTH =
  280;

export const X_CREATE_POST_ENDPOINT =
  "https://api.x.com/2/tweets";

export type XTextPostDryRun = {
  endpoint:
    typeof X_CREATE_POST_ENDPOINT;

  method:
    "POST";

  captionLength:
    number;

  body: {
    text:
      string;
  };
};

export function buildXTextPostDryRun(
  input: {
    caption:
      string;
  }
):
  XTextPostDryRun {

  const caption =
    input.caption.trim();

  if (!caption) {
    throw new Error(
      "X_CAPTION_EMPTY"
    );
  }

  /*
   * V1 verwendet bewusst ein konservatives
   * 280-Zeichen-Limit.
   *
   * X verwendet für bestimmte Inhalte eine
   * gewichtete Zeichenzählung. Vor einem
   * späteren erweiterten Composer bleibt
   * dieser Guard absichtlich streng.
   */
  if (
    caption.length >
    X_TEXT_POST_MAX_LENGTH
  ) {
    throw new Error(
      "X_CAPTION_TOO_LONG"
    );
  }

  return {
    endpoint:
      X_CREATE_POST_ENDPOINT,

    method:
      "POST",

    captionLength:
      caption.length,

    body: {
      text:
        caption,
    },
  };
}
