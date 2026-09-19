import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export const BROKER_MARKETING_APPROVAL_REQUIRED =
  "BROKER_MARKETING_APPROVAL_REQUIRED";


export async function isBrokerMarketingApproved(
  input: {
    userId:
      string;

    listingId:
      string;
  }
):
  Promise<boolean> {

  const userId =
    input.userId.trim();

  const listingId =
    input.listingId.trim();


  if (
    !userId ||
    !listingId
  ) {
    return false;
  }


  const listing =
    await prisma.listing.findFirst({
      where: {
        id:
          listingId,

        userId,
      },

      select: {
        brokerWorkflow: {
          select: {
            marketingApprovedAt:
              true,
          },
        },
      },
    });


  return Boolean(
    listing
      ?.brokerWorkflow
      ?.marketingApprovedAt
  );
}
