import { headers } from "next/headers";
import HomePageClient from "./HomePageClient";
import { getInseratAiMarketFromHeaders } from "@/lib/inserat-ai-market";

export default async function HomePage() {
  const requestHeaders = await headers();
  const initialMarket =
    getInseratAiMarketFromHeaders(requestHeaders) ??
    "CH";

  return (
    <HomePageClient initialMarket={initialMarket} />
  );
}
