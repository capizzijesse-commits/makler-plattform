import "server-only";

import { prisma } from "@/lib/prisma";

import {
  mapPrismaListingToPortal,
} from "./prisma-listing-adapter";

import {
  buildSwissRetsInventory,
  validateSwissRetsListings,
} from "./swissrets-json.server";


function requireUserId(
  userId: string
): string {
  const clean =
    userId.trim();

  if (!clean) {
    throw new Error(
      "SwissRETS Feed benötigt eine User-ID."
    );
  }

  return clean;
}


export async function loadSwissRetsListingsForUser(
  userId: string
) {
  const cleanUserId =
    requireUserId(
      userId
    );

  /*
   * Schweizer Feed:
   *
   * - explizit countryCode=CH
   * - Legacy market=CH
   * - ältere null/null Listings
   *
   * DE-Objekte werden ausdrücklich
   * ausgeschlossen.
   */
  const listings =
    await prisma.listing.findMany({
      where: {
        userId:
          cleanUserId,

        archivedAt:
          null,

        unlockStatus: {
          in: [
            "paid",
            "included",
          ],
        },

        OR: [
          {
            countryCode:
              "CH",
          },

          {
            countryCode:
              null,

            market:
              "CH",
          },

          {
            countryCode:
              null,

            market:
              null,
          },
        ],
      },

      include: {
        finance:
          true,

        images: {
          orderBy: [
            {
              isPrimary:
                "desc",
            },

            {
              position:
                "asc",
            },

            {
              createdAt:
                "asc",
            },
          ],
        },
      },

      orderBy: {
        updatedAt:
          "desc",
      },
    });


  return listings.map(
    (listing) =>
      mapPrismaListingToPortal(
        listing
      )
  );
}


export async function buildSwissRetsFeedForUser(
  userId: string
) {
  const listings =
    await loadSwissRetsListingsForUser(
      userId
    );


  /*
   * Ein unvollstaendiges Listing darf
   * niemals den gesamten SwissRETS-Feed
   * oder das Portal-Cockpit zerstoeren.
   *
   * Jedes Listing wird isoliert geprueft.
   * Nur SwissRETS-faehige Listings
   * gelangen ins Inventory.
   */
  const validListings =
    [] as typeof listings;

  const validationErrors:
    unknown[] = [];


  for (const listing of listings) {

    try {

      const errors =
        validateSwissRetsListings(
          [listing]
        );


      if (errors.length > 0) {

        validationErrors.push(
          ...errors
        );

        continue;
      }


      validListings.push(
        listing
      );
    }
    catch (error) {

      validationErrors.push(
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }


  const inventory =
    buildSwissRetsInventory(
      validListings
    );


  return {
    valid:
      validationErrors.length ===
      0,

    listingCount:
      listings.length,

    validationErrors,

    inventory,

    json:
      JSON.stringify(
        inventory,
        null,
        2
      ),
  };
}
