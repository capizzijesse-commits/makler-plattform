import "server-only";

import {
  prisma,
} from "@/lib/prisma";


export type GermanPortalListingReadiness = {
  candidateCount: number;
  listingCount: number;
  waitingForUnlockCount: number;
};


function requireUserId(
  userId: string
): string {

  const cleanUserId =
    userId.trim();

  if (!cleanUserId) {
    throw new Error(
      "German portal readiness benötigt eine User-ID."
    );
  }

  return cleanUserId;
}


export async function getGermanPortalListingReadinessForUser(
  userId: string
): Promise<GermanPortalListingReadiness> {

  const cleanUserId =
    requireUserId(
      userId
    );

  /*
   * Deutschland-Portale:
   *
   * Nur explizit countryCode=DE.
   *
   * market=DE allein reicht NICHT,
   * weil z.B. österreichische Listings
   * ebenfalls market=DE tragen können.
   */
  const baseWhere = {
    userId:
      cleanUserId,

    archivedAt:
      null,

    countryCode:
      "DE",
  } as const;


  const [
    candidateCount,
    listingCount,
  ] =
    await Promise.all([
      prisma.listing.count({
        where:
          baseWhere,
      }),

      prisma.listing.count({
        where: {
          ...baseWhere,

          unlockStatus: {
            in: [
              "paid",
              "included",
            ],
          },
        },
      }),
    ]);


  return {
    candidateCount,

    listingCount,

    waitingForUnlockCount:
      Math.max(
        0,
        candidateCount -
          listingCount
      ),
  };
}