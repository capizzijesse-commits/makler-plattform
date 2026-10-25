import "server-only";
import { isListingPremiumPublicationReady } from "@/lib/premium-quality.server";
export const BROKER_MARKETING_APPROVAL_REQUIRED = "BROKER_MARKETING_APPROVAL_REQUIRED";
export async function isBrokerMarketingApproved(input: { userId: string; listingId: string }): Promise<boolean> {
  return !!input.userId.trim() && !!input.listingId.trim() && await isListingPremiumPublicationReady(input.userId, input.listingId);
}
