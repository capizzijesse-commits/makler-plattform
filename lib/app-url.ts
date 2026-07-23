const PRODUCTION_APP_URL = "https://www.inserat-ai.ch";

export function getAppUrl(requestUrl?: string): string {
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");

  const candidate =
    configuredAppUrl ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_APP_URL
      : requestUrl
        ? new URL(requestUrl).origin
        : "http://localhost:3000");

  const parsedUrl = new URL(candidate);

  if (
    parsedUrl.protocol !== "https:" &&
    parsedUrl.protocol !== "http:"
  ) {
    throw new Error("Ungültiges Protokoll für die Anwendungs-URL.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    parsedUrl.protocol !== "https:"
  ) {
    throw new Error(
      "Die Produktions-URL von Inserat-AI muss HTTPS verwenden."
    );
  }

  return parsedUrl.origin;
}
