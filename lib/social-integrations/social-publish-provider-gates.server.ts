import "server-only";


export type EnabledSocialPublishTarget = {
  provider:
    "meta" |
    "linkedin";

  channel:
    "instagram_business" |
    "linkedin";
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


export function isLinkedInPublishingEnabled():
  boolean {

  return enabled(
    "LINKEDIN_PUBLISHING_ENABLED"
  );
}


export function enabledSocialPublishTargets():
  EnabledSocialPublishTarget[] {

  const targets:
    EnabledSocialPublishTarget[] =
      [];


  if (
    isMetaPublishingEnabled()
  ) {
    targets.push({
      provider:
        "meta",

      channel:
        "instagram_business",
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
