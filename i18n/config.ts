export const locales = ["de", "it", "fr", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "de";

export const localeCookieName = "INSERAT_AI_LOCALE";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return locales.includes(value as AppLocale);
}