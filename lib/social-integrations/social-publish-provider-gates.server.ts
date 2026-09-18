import "server-only";


export type EnabledSocialPublishTarget = {
  provider:
    "meta" |
    "linkedin" |
    "x";

  channel:
    "facebook_page" |
    "instagram_business" |
    "linkedin" |
    "x";
};


function enabled(
  name:
    string
):
  boolean {

  return (
    process.env[
      name
    ]?.trim() ===
    "1"
  );
}


export function isMetaPublishingEnabled():
  boolean {

  return enabled(
    "META_PUBLISHING_ENABLED"
  );
}


export function isMetaInstagramPublishingEnabled():
  boolean {

  return (
    isMetaPublishingEnabled() &&
    enabled(
      "META_INSTAGRAM_PUBLISHING_ENABLED"
    )
  );
}


export function isMetaFacebookPublishingEnabled():
  boolean {

  return (
    isMetaPublishingEnabled() &&
    enabled(
      "META_FACEBOOK_PUBLISHING_ENABLED"
    )
  );
}


export function isLinkedInPublishingEnabled():
  boolean {

  return enabled(
    "LINKEDIN_PUBLISHING_ENABLED"
  );
}

export function isXPublishingEnabled():
  boolean {

  return enabled(
    "X_PUBLISHING_ENABLED"
  );
}


export function enabledSocialPublishTargets():
  EnabledSocialPublishTarget[] {

  const targets:
    EnabledSocialPublishTarget[] =
      [];


  if (
    isMetaInstagramPublishingEnabled()
  ) {
    targets.push({
      provider:
        "meta",

      channel:
        "instagram_business",
    });
  }


  if (
    isMetaFacebookPublishingEnabled()
  ) {
    targets.push({
      provider:
        "meta",

      channel:
        "facebook_page",
    });
  }


  if (
    isLinkedInPublishingEnabled()
  ) {
    targets.push({
      provider:
        "linkedin",

      channel:
        "linkedin",
    });
  }

  if (
    isXPublishingEnabled()
  ) {
    targets.push({
      provider:
        "x",

      channel:
        "x",
    });
  }



  return targets;
}


export function isSocialPublishProviderEnabled(
  provider:
    string
):
  boolean {

  return enabledSocialPublishTargets()
    .some(
      target =>
        target.provider ===
        provider
    );
}


export function isSocialPublishTargetEnabled(
  provider:
    string,
  channel:
    string
):
  boolean {

  return enabledSocialPublishTargets()
    .some(
      target =>
        target.provider ===
          provider &&
        target.channel ===
          channel
    );
}
