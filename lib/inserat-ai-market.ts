export type InseratAiMarket = "CH" | "DE";
export type InseratAiCurrency = "chf" | "eur";

export const INSERAT_AI_MARKET_STORAGE_KEY =
  "inseratAiMarket";

export const INSERAT_AI_MARKET_EVENT =
  "inserat-ai-market-change";

function normalizeHostname(
  value: string | null | undefined
): string {
  return (value ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/\.$/, "")
    .replace(/:\d+$/, "");
}

export function getInseratAiMarketFromHostname(
  value: string | null | undefined
): InseratAiMarket | null {
  const hostname = normalizeHostname(value);

  if (
    hostname === "inserat-ai.de" ||
    hostname.endsWith(".inserat-ai.de")
  ) {
    return "DE";
  }

  if (
    hostname === "inserat-ai.ch" ||
    hostname.endsWith(".inserat-ai.ch")
  ) {
    return "CH";
  }

  return null;
}

export function getInseratAiMarketFromHeaders(
  requestHeaders: Pick<Headers, "get">
): InseratAiMarket | null {
  return getInseratAiMarketFromHostname(
    requestHeaders.get("x-forwarded-host") ??
      requestHeaders.get("host")
  );
}

export function getInseratAiCurrencyForMarket(
  market: InseratAiMarket
): InseratAiCurrency {
  return market === "DE" ? "eur" : "chf";
}

export function getInseratAiCurrencyFromHeaders(
  requestHeaders: Pick<Headers, "get">
): InseratAiCurrency {
  const market =
    getInseratAiMarketFromHeaders(requestHeaders);

  return getInseratAiCurrencyForMarket(
    market ?? "CH"
  );
}

export function isInseratAiCurrency(
  value: unknown
): value is InseratAiCurrency {
  return value === "chf" || value === "eur";
}
