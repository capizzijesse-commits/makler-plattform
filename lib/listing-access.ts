import { prisma } from "@/lib/prisma";
import { normalizeUserPlan } from "@/lib/plans";

type ListingCoreAccessInput = {
  userId: string;
  plan: unknown;
  listingId?: unknown;
};

export async function canUseListingCoreForUser({
  userId,
  plan,
  listingId,
}: ListingCoreAccessInput): Promise<boolean> {
  const normalizedPlan = normalizeUserPlan(plan);

  if (normalizedPlan !== "free") {
    return true;
  }

  if (
    typeof listingId !== "string" ||
    !listingId.trim() ||
    listingId.trim().length > 128
  ) {
    return false;
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId.trim(),
      userId,
    },
    select: {
      unlockStatus: true,
    },
  });

  return (
    listing?.unlockStatus === "paid" ||
    listing?.unlockStatus === "included"
  );
}