export const USER_PLANS = [
  "free",
  "founder",
  "pro",
  "agency",
  "admin",
] as const;

export type UserPlan = (typeof USER_PLANS)[number];

export const OFFER_PRICES_CENTS = {
  singleObject: 990,
  founder: 1990,
  pro: 7990,
  agency: 14990,
} as const;

export const PLAN_LABELS: Record<UserPlan, string> = {
  free: "Einzelobjekt / Testzugang",
  founder: "Founder",
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

  /*
   * Frühere Standard-Konten werden sicher auf Founder abgebildet.
   * Dadurch verlieren bestehende Benutzer keinen Basiszugang.
   */
  if (normalized === "standard") {
    return "founder";
  }

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
  const isAgency = plan === "agency";
  const isPro = plan === "pro";

  const isProOrHigher =
    isPro ||
    isAgency ||
    isAdmin;

  const isFounderOrHigher =
    plan === "founder" ||
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
     * Founder CHF 19.90 und höhere Pläne:
     * mehrere Immobilien und vollständiger Basis-Arbeitsbereich.
     */
    canUseMultipleListings: isFounderOrHigher,
    canUseBasicCockpit: isFounderOrHigher,
    canUseStandardImageAnalysis: isFounderOrHigher,
    canUseSocialMedia: isFounderOrHigher,
    canUseExpose: isFounderOrHigher,

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
 * Basisfunktionen eines konkreten Objekts:
 * Founder/Pro/Agency/Admin oder bezahltes Einzelobjekt.
 */
export function hasListingCoreAccess(
  planValue: unknown,
  listing: ListingAccessInput | null | undefined
): boolean {
  const capabilities = getPlanCapabilities(planValue);

  return (
    capabilities.canUseBasicCockpit ||
    isPaidSingleObjectListing(listing)
  );
}

export function hasProAccess(value: unknown): boolean {
  return getPlanCapabilities(value).canUsePremiumCockpit;
}
