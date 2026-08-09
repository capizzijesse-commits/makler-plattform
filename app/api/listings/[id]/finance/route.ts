import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { hasListingCoreAccess } from "@/lib/plans";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function optionalInteger(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value
          .replace(/['\u2019\s]/g, "")
          .replace(",", ".")
      : value;

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return Math.round(parsed);
}

function optionalFloat(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    typeof value === "string"
      ? value
          .replace(/['\u2019\s]/g, "")
          .replace(",", ".")
      : value;

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function optionalText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const text = value.trim();

  return text.length > 0
    ? text.slice(0, 4000)
    : null;
}

async function getAccessibleListing(
  request: NextRequest,
  id: string
) {
  const user = await getAuthenticatedUser(
    request
  );

  if (!user) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
        },
        {
          status: 401,
        }
      ),
      listing: null,
    };
  }

  const listing =
    await prisma.listing.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        finance: true,
      },
    });

  if (!listing) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            "Die Immobilie wurde nicht gefunden.",
        },
        {
          status: 404,
        }
      ),
      listing: null,
    };
  }

  if (
    !hasListingCoreAccess(
      user.plan,
      listing
    )
  ) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            "Diese Immobilie ist noch nicht freigeschaltet.",
        },
        {
          status: 403,
        }
      ),
      listing: null,
    };
  }

  return {
    response: null,
    listing,
  };
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const access =
      await getAccessibleListing(
        request,
        id
      );

    if (access.response) {
      return access.response;
    }

    const listing = access.listing!;

    return NextResponse.json({
      success: true,
      listing: {
        id: listing.id,
        location: listing.location,
        propertyType:
          listing.propertyType,
        livingArea:
          listing.livingArea,
        price: listing.price,
      },
      finance: listing.finance,
    });
  } catch (error) {
    console.error(
      "Fehler beim Laden der Finanzdaten:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Finanzdaten konnten nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;

    const access =
      await getAccessibleListing(
        request,
        id
      );

    if (access.response) {
      return access.response;
    }

    const body = await request.json();

    const marketingType =
      body.marketingType === "rent"
        ? "rent"
        : "sale";

    const askingPrice =
      optionalInteger(
        body.askingPrice
      );

    const commissionRate =
      optionalFloat(
        body.commissionRate
      );

    const financingEquity =
      optionalInteger(
        body.financingEquity
      );

    const financingHardEquity =
      optionalInteger(
        body.financingHardEquity
      );

    const financingAnnualGrossIncome =
      optionalInteger(
        body.financingAnnualGrossIncome
      );

    if (
      commissionRate !== null &&
      commissionRate > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Provision darf nicht mehr als 100 Prozent betragen.",
        },
        {
          status: 400,
        }
      );
    }

    const depositMonths =
      optionalInteger(
        body.depositMonths
      );

    if (
      marketingType === "rent" &&
      depositMonths !== null &&
      depositMonths > 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bei Wohnraummieten sind maximal 3 Monatszinse als Sicherheit vorgesehen.",
          code:
            "RENTAL_DEPOSIT_LIMIT",
        },
        {
          status: 400,
        }
      );
    }

    if (
      marketingType === "sale" &&
      askingPrice !== null &&
      financingEquity !== null &&
      financingEquity > askingPrice
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Eigenkapital darf den Kaufpreis nicht übersteigen.",
          code:
            "FINANCING_EQUITY_EXCEEDS_PRICE",
        },
        {
          status: 400,
        }
      );
    }

    if (
      marketingType === "sale" &&
      financingEquity !== null &&
      financingHardEquity !== null &&
      financingHardEquity >
        financingEquity
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Eigenmittel ausserhalb der 2. Säule dürfen das gesamte Eigenkapital nicht übersteigen.",
          code:
            "FINANCING_HARD_EQUITY_EXCEEDS_TOTAL",
        },
        {
          status: 400,
        }
      );
    }

    const finance =
      await prisma.listingFinance.upsert({
        where: {
          listingId: id,
        },
        create: {
          listingId: id,
          marketingType,

          askingPrice,

          minimumPrice:
            optionalInteger(
              body.minimumPrice
            ),

          commissionRate,

          financingEquity,
          financingHardEquity,
          financingAnnualGrossIncome,

          netRentMonthly:
            optionalInteger(
              body.netRentMonthly
            ),

          additionalCostsMonthly:
            optionalInteger(
              body.additionalCostsMonthly
            ),

          heatingCostsMonthly:
            optionalInteger(
              body.heatingCostsMonthly
            ),

          depositMonths,

          notes:
            optionalText(
              body.notes
            ),
        },
        update: {
          marketingType,

          askingPrice,

          minimumPrice:
            optionalInteger(
              body.minimumPrice
            ),

          commissionRate,

          financingEquity,
          financingHardEquity,
          financingAnnualGrossIncome,

          netRentMonthly:
            optionalInteger(
              body.netRentMonthly
            ),

          additionalCostsMonthly:
            optionalInteger(
              body.additionalCostsMonthly
            ),

          heatingCostsMonthly:
            optionalInteger(
              body.heatingCostsMonthly
            ),

          depositMonths,

          notes:
            optionalText(
              body.notes
            ),
        },
      });

    return NextResponse.json({
      success: true,
      message:
        "Finanzdaten wurden gespeichert.",
      finance,
    });
  } catch (error) {
    console.error(
      "Fehler beim Speichern der Finanzdaten:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Finanzdaten konnten nicht gespeichert werden.",
      },
      {
        status: 500,
      }
    );
  }
}