export const USER_PLANS = [
  "free",
  "founder",
  "standard",
  "pro",
  "agency",
  "admin",
] as const;

export type UserPlan = (typeof USER_PLANS)[number];

export type PlanCapabilities = {
  plan: UserPlan;
  canUseGenerator: boolean;
  canUseBasicCockpit: boolean;
  canUseSocialMedia: boolean;
  canUsePremiumCockpit: boolean;
  canUsePublishingCenter: boolean;
  canUseSecretMarketing: boolean;
  canUseLocationAssistant: boolean;
  canUseTourGuide: boolean;
  canUseAgencyFeatures: boolean;
};

export function normalizeUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") {
    return "free";
  }

  const normalized = value.trim().toLowerCase();

  if (USER_PLANS.includes(normalized as UserPlan)) {
    return normalized as UserPlan;
  }

  return "free";
}

export function getPlanCapabilities(
  value: unknown
): PlanCapabilities {
  const plan = normalizeUserPlan(value);

  const isAdmin = plan === "admin";
  const isProOrHigher =
    plan === "pro" ||
    plan === "agency" ||
    isAdmin;

  const hasBasicCockpit =
    plan === "founder" ||
    plan === "standard" ||
    isProOrHigher;

  const hasSocialMedia =
    plan === "founder" ||
    plan === "standard" ||
    isProOrHigher;

  return {
    plan,

    // Alle registrierten Benutzer dürfen den Generator testen.
    canUseGenerator: true,

    // Founder und Standard erhalten das begrenzte Cockpit.
    canUseBasicCockpit: hasBasicCockpit,

    // Social-Texte bleiben auch im Founder-/Standard-Angebot.
    canUseSocialMedia: hasSocialMedia,

    // Vollständige Marketing-Verwaltung ab Pro 79.90 CHF.
    canUsePremiumCockpit: isProOrHigher,
    canUsePublishingCenter: isProOrHigher,
    canUseSecretMarketing: isProOrHigher,
    canUseLocationAssistant: isProOrHigher,
    canUseTourGuide: isProOrHigher,

    // Team- und Agenturfunktionen erst ab Agency.
    canUseAgencyFeatures:
      plan === "agency" || isAdmin,
  };
}

export function hasProAccess(value: unknown): boolean {
  return getPlanCapabilities(value).canUsePremiumCockpit;
}