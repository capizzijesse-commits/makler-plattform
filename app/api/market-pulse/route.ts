import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";

import {
  rankMarketPulseRegions,
  type MarketPulseRegionInput,
} from "@/lib/market-pulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS =
  24 * 60 * 60 * 1000;

function clamp01(
  value: number
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(0, value)
  );
}

function normalizeCountry(
  countryCode:
    | string
    | null,
  market:
    | string
    | null
): string {
  return (
    countryCode ||
    market ||
    "XX"
  )
    .trim()
    .toUpperCase();
}

function normalizeLocation(
  value: string
): string {
  return value
    .trim()
    .replace(/\s+/g, " ");
}

function isPaidListing(
  listing: {
    paymentModel: string;
    unlockStatus: string;
    user: {
      plan: string;
    };
  }
): boolean {
  if (
    listing.user.plan !== "free"
  ) {
    return true;
  }

  return (
    listing.paymentModel ===
      "single_object" &&
    listing.unlockStatus ===
      "paid"
  );
}

export async function GET(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(
        request
      );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Market Pulse ist aktuell nur für den Inserat-AI Operator freigeschaltet.",
        },
        {
          status: 403,
        }
      );
    }

    const requestedCountry =
      request.nextUrl.searchParams
        .get("country")
        ?.trim()
        .toUpperCase() ??
      "";

    const now =
      Date.now();

    const cutoff30 =
      new Date(
        now -
          30 *
            DAY_MS
      );

    const cutoff60 =
      new Date(
        now -
          60 *
            DAY_MS
      );

    const cutoff120 =
      new Date(
        now -
          120 *
            DAY_MS
      );

    const listings =
      await prisma.listing.findMany({
        where: {
          archivedAt: null,
          createdAt: {
            gte: cutoff120,
          },
        },

        select: {
          id: true,
          userId: true,

          location: true,
          postalCode: true,

          latitude: true,
          longitude: true,

          market: true,
          countryCode: true,

          createdAt: true,
          updatedAt: true,

          paymentModel: true,
          unlockStatus: true,
          paidAt: true,

          user: {
            select: {
              plan: true,
            },
          },

          listingViewEvents: {
            where: {
              createdAt: {
                gte: cutoff60,
              },
            },

            select: {
              createdAt: true,
            },
          },
        },
      });

    type RegionBucket = {
      id: string;
      label: string;
      countryCode: string;

      totalListings: number;
      recentListings: number;
      previousListings: number;

      recentViews: number;
      previousViews: number;

      staleListings: number;

      brokerIds: Set<string>;
      freeBrokerIds: Set<string>;
      paidBrokerIds: Set<string>;

      latitudes: number[];
      longitudes: number[];
    };

    const buckets =
      new Map<
        string,
        RegionBucket
      >();

    for (
      const listing of listings
    ) {
      const country =
        normalizeCountry(
          listing.countryCode,
          listing.market
        );

      if (
        requestedCountry &&
        country !==
          requestedCountry
      ) {
        continue;
      }

      const location =
        normalizeLocation(
          listing.location
        );

      if (!location) {
        continue;
      }

      const id =
        `${country}:${location.toLowerCase()}`;

      let bucket =
        buckets.get(id);

      if (!bucket) {
        bucket = {
          id,
          label: location,
          countryCode:
            country,

          totalListings: 0,
          recentListings: 0,
          previousListings: 0,

          recentViews: 0,
          previousViews: 0,

          staleListings: 0,

          brokerIds:
            new Set<string>(),

          freeBrokerIds:
            new Set<string>(),

          paidBrokerIds:
            new Set<string>(),

          latitudes: [],
          longitudes: [],
        };

        buckets.set(
          id,
          bucket
        );
      }

      bucket.totalListings +=
        1;

      bucket.brokerIds.add(
        listing.userId
      );

      const paid =
        isPaidListing(
          listing
        );

      if (paid) {
        bucket.paidBrokerIds.add(
          listing.userId
        );
      }
      else {
        bucket.freeBrokerIds.add(
          listing.userId
        );
      }

      if (
        listing.createdAt >=
        cutoff30
      ) {
        bucket.recentListings +=
          1;
      }
      else if (
        listing.createdAt >=
        cutoff60
      ) {
        bucket.previousListings +=
          1;
      }

      let recentViews =
        0;

      let previousViews =
        0;

      for (
        const view of
          listing.listingViewEvents
      ) {
        if (
          view.createdAt >=
          cutoff30
        ) {
          recentViews += 1;
        }
        else {
          previousViews +=
            1;
        }
      }

      bucket.recentViews +=
        recentViews;

      bucket.previousViews +=
        previousViews;

      const isOld =
        listing.createdAt <
        cutoff30;

      const hasLowRecentDemand =
        recentViews <= 1;

      if (
        isOld &&
        hasLowRecentDemand
      ) {
        bucket.staleListings +=
          1;
      }

      if (
        typeof listing.latitude ===
          "number" &&
        Number.isFinite(
          listing.latitude
        )
      ) {
        bucket.latitudes.push(
          listing.latitude
        );
      }

      if (
        typeof listing.longitude ===
          "number" &&
        Number.isFinite(
          listing.longitude
        )
      ) {
        bucket.longitudes.push(
          listing.longitude
        );
      }
    }

    const regions =
      [...buckets.values()];

    const maxRecentListings =
      Math.max(
        1,
        ...regions.map(
          (region) =>
            region.recentListings
        )
      );

    const maxFreeBrokers =
      Math.max(
        1,
        ...regions.map(
          (region) =>
            region.freeBrokerIds
              .size
        )
      );

    const maxRecentViews =
      Math.max(
        1,
        ...regions.map(
          (region) =>
            region.recentViews
        )
      );

    const pulseInputs:
      MarketPulseRegionInput[] =
      regions.map(
        (region) => {
          const brokerCount =
            region.brokerIds
              .size;

          const freeBrokerCount =
            region.freeBrokerIds
              .size;

          const paidBrokerCount =
            region.paidBrokerIds
              .size;

          const listingActivity =
            region.recentListings /
            maxRecentListings;

          /*
           * Für V1 bedeutet Broker Density:
           * Wie viele noch nicht zahlende
           * Inserat-AI-Makler gibt es in
           * dieser Region relativ zu anderen
           * Regionen?
           */
          const brokerDensity =
            freeBrokerCount /
            maxFreeBrokers;

          const recentViewVolume =
            region.recentViews /
            maxRecentViews;

          const growth =
            (
              region.recentViews -
              region.previousViews
            ) /
            Math.max(
              1,
              region.previousViews
            );

          const normalizedGrowth =
            clamp01(
              (
                Math.max(
                  -1,
                  Math.min(
                    2,
                    growth
                  )
                ) +
                1
              ) /
                3
            );

          const demandMomentum =
            clamp01(
              recentViewVolume *
                0.6 +
                normalizedGrowth *
                  0.4
            );

          const staleListingPressure =
            region.totalListings >
            0
              ? region.staleListings /
                region.totalListings
              : 0;

          const conversionPotential =
            brokerCount > 0
              ? freeBrokerCount /
                brokerCount
              : 0;

          /*
           * Interne Inserat-AI-Penetration:
           * Anteil der Makler in dieser
           * Region, die bereits bezahlt
           * haben. Der Kernalgorithmus
           * invertiert dieses Signal.
           */
          const inseratAiPenetration =
            brokerCount > 0
              ? paidBrokerCount /
                brokerCount
              : 0;

          const sampleConfidence =
            clamp01(
              (
                Math.min(
                  region.totalListings,
                  8
                ) /
                  8
              ) *
                0.55 +
                (
                  Math.min(
                    brokerCount,
                    4
                  ) /
                  4
                ) *
                  0.45
            );

          const hasCoordinates =
            region.latitudes
              .length > 0 &&
            region.longitudes
              .length > 0;

          const center =
            hasCoordinates
              ? {
                  latitude:
                    region.latitudes.reduce(
                      (
                        sum,
                        value
                      ) =>
                        sum +
                        value,
                      0
                    ) /
                    region.latitudes
                      .length,

                  longitude:
                    region.longitudes.reduce(
                      (
                        sum,
                        value
                      ) =>
                        sum +
                        value,
                      0
                    ) /
                    region.longitudes
                      .length,
                }
              : undefined;

          return {
            id:
              region.id,

            label:
              region.label,

            countryCode:
              region.countryCode,

            center,

            confidence:
              sampleConfidence,

            signals: {
              listingActivity,
              brokerDensity,
              demandMomentum,
              staleListingPressure,
              conversionPotential,
              inseratAiPenetration,
            },
          };
        }
      );

    const ranked =
      rankMarketPulseRegions(
        pulseInputs
      );

    return NextResponse.json({
      success: true,

      version:
        "market-pulse-internal-v1",

      generatedAt:
        new Date().toISOString(),

      country:
        requestedCountry ||
        null,

      regionCount:
        ranked.length,

      regions:
        ranked.slice(
          0,
          25
        ),
    });
  }
  catch (error) {
    console.error(
      "MARKET_PULSE_ERROR",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Market Pulse konnte nicht berechnet werden.",
      },
      {
        status: 500,
      }
    );
  }
}
