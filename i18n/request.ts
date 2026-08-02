import {cookies} from "next/headers";
import {getRequestConfig} from "next-intl/server";
import {
  defaultLocale,
  isAppLocale,
  localeCookieName,
} from "./config";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get(localeCookieName)?.value;
  const locale =
    isAppLocale(savedLocale)
      ? savedLocale
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Europe/Zurich",
  };
});