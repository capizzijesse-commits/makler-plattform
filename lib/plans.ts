export const USER_PLANS = [
  "free",
  "founder",
  "standard",
  "pro",
  "agency",
  "admin",
] as const;

export type UserPlan = (typeof USER_PLANS)[number];

export const OFFER_PRICES_CENTS = {
  singleObject: 990,
  founder: 1990,
  standard: 3990,
  pro: 7990,
  agency: 14990,
} as const;

export const PLAN_LABELS: Record<UserPlan, string> = {
  free: "Einzelobjekt / Testzugang",
  founder: "Founder",
  standard: "Standard",
  pro: "Pro",
  agency: "Agency",
  admin: "Admin",
};

export type PlanCapabilities = {
  plan: UserPlan;

  canUseGenerator: boolean;
  canUseMultipleListings: boolean;
  canUseBasicCockpit: boolean;
  canUseStandardImageAnalysis: boolean;
  canUseSocialMedia: boolean;
  canUseExpose: boolean;

  canUsePremiumCockpit: boolean;
  canUseAdvancedImageAnalysis: boolean;
  canUseHomeStaging: boolean;
  canUsePublishingCenter: boolean;
  canUseSecretMarketing: boolean;
  canUseLocationAssistant: boolean;
  canUseTourGuide: boolean;
  canUseMultiListingGeneration: boolean;

  canUseAgencyFeatures: boolean;
};

export type ListingAccessInput = {
  paymentModel?: unknown;
  unlockStatus?: unknown;
};

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

export function normalizeUserPlan(value: unknown): UserPlan {
  const normalized = normalizeString(value);

  if (USER_PLANS.includes(normalized as UserPlan)) {
    return normalized as UserPlan;
  }

  return "free";
}

export type TrialPlanInput = {
  plan?: unknown;
  trialPlan?: unknown;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
};

export function getEffectiveUserPlan(
  user: TrialPlanInput,
  now: Date = new Date()
): UserPlan {
  const storedPlan = normalizeUserPlan(user.plan);

  // Bezahlte und administrative Plaene haben Vorrang.
  if (storedPlan !== "free") {
    return storedPlan;
  }

  const trialPlan = normalizeUserPlan(user.trialPlan);

  // Der kartenlose Testzugang ist ausschliesslich Pro.
  if (trialPlan !== "pro") {
    return storedPlan;
  }

  const startedAt =
    user.trialStartedAt instanceof Date
      ? user.trialStartedAt
      : user.trialStartedAt
        ? new Date(user.trialStartedAt)
        : null;

  const endsAt =
    user.trialEndsAt instanceof Date
      ? user.trialEndsAt
      : user.trialEndsAt
        ? new Date(user.trialEndsAt)
        : null;

  if (
    !startedAt ||
    !endsAt ||
    Number.isNaN(startedAt.getTime()) ||
    Number.isNaN(endsAt.getTime())
  ) {
    return storedPlan;
  }

  if (
    startedAt.getTime() > now.getTime() ||
    endsAt.getTime() <= now.getTime()
  ) {
    return storedPlan;
  }

  return "pro";
}

export function getPlanCapabilities(
  value: unknown
): PlanCapabilities {
  const plan = normalizeUserPlan(value);

  const isAdmin = plan === "admin";
  const isAgency = plan === "agency";
  const isPro = plan === "pro";

  const isProOrHigher =
    isPro ||
    isAgency ||
    isAdmin;

  /*
   * Founder CHF 19.90 und Standard CHF 39.90 besitzen
   * dieselben vollständigen Basisfunktionen.
   */
  const hasCompleteBasePlan =
    plan === "founder" ||
    plan === "standard" ||
    isProOrHigher;

  return {
    plan,

    /*
     * Der Generator darf als Einstieg getestet werden.
     * Die dauerhafte Nutzung eines Einzelobjekts wird zusätzlich
     * über den Zahlungsstatus des jeweiligen Objekts geprüft.
     */
    canUseGenerator: true,

    /*
     * Founder, Standard, Pro, Agency und Admin:
     * mehrere Immobilien und vollständiger Basis-Arbeitsbereich.
     */
    canUseMultipleListings: hasCompleteBasePlan,
    // Jeder angemeldete Nutzer darf das Basis-Cockpit verwenden.
    canUseBasicCockpit: true,
    canUseStandardImageAnalysis: hasCompleteBasePlan,
    // Social Media ist Teil des kostenlosen Einstiegs.
    canUseSocialMedia: true,
    canUseExpose: hasCompleteBasePlan,

    /*
     * Pro CHF 79.90 und höhere Pläne:
     * Premium-Vermarktung und Automatisierung.
     */
    canUsePremiumCockpit: isProOrHigher,
    canUseAdvancedImageAnalysis: isProOrHigher,
    canUseHomeStaging: isProOrHigher,
    canUsePublishingCenter: isProOrHigher,
    canUseSecretMarketing: isProOrHigher,
    canUseLocationAssistant: isProOrHigher,
    canUseTourGuide: isProOrHigher,
    canUseMultiListingGeneration: isProOrHigher,

    /*
     * Agency CHF 149.90:
     * technisch vorbereitet, aber noch nicht aktiv zu verkaufen.
     */
    canUseAgencyFeatures:
      isAgency ||
      isAdmin,
  };
}

/*
 * Ein bezahltes CHF-9.90-Einzelobjekt besitzt Basiszugang,
 * obwohl das Benutzerkonto weiterhin den Plan "free" haben kann.
 */
export function isPaidSingleObjectListing(
  listing: ListingAccessInput | null | undefined
): boolean {
  if (!listing) {
    return false;
  }

  return (
    normalizeString(listing.paymentModel) === "single_object" &&
    normalizeString(listing.unlockStatus) === "paid"
  );
}

/*
 * Bezahlte Kerninhalte eines konkreten Objekts:
 * Founder/Standard/Pro/Agency/Admin oder bezahltes Einzelobjekt.
 * Das kostenlose Basis-Cockpit ist davon bewusst getrennt.
 */
export function hasListingCoreAccess(
  planValue: unknown,
  listing: ListingAccessInput | null | undefined
): boolean {
  const plan = normalizeUserPlan(planValue);

  return (
    plan !== "free" ||
    isPaidSingleObjectListing(listing)
  );
}

export function hasProAccess(value: unknown): boolean {
  return getPlanCapabilities(value).canUsePremiumCockpit;
}
