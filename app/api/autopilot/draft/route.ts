import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { normalizeUserPlan } from "@/lib/plans";
import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

type AutopilotDraftBody = {
  market?: unknown;
};

function resolveMarket(
  request: NextRequest,
  requestedMarket: unknown
): "CH" | "DE" {
  if (
    requestedMarket === "CH" ||
    requestedMarket === "DE"
  ) {
    return requestedMarket;
  }

  const host =
    (
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host") ??
      ""
    )
      .split(",")[0]
      .trim()
      .toLowerCase()
      .replace(/:\d+$/, "");

  if (
    host === "inserat-ai.de" ||
    host.endsWith(".inserat-ai.de")
  ) {
    return "DE";
  }

  return "CH";
}

export async function POST(
  request: NextRequest
) {
  try {
    const user =
      await getAuthenticatedUser(request);

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

    const body =
      (
        await request
          .json()
          .catch(() => ({}))
      ) as AutopilotDraftBody;

    const market =
      resolveMarket(
        request,
        body.market
      );

    const normalizedPlan =
      normalizeUserPlan(user.plan);

    const usesSingleObjectPayment =
      normalizedPlan === "free";

    const listing =
      await prisma.listing.create({
        data: {
          userId:
            user.id,

          projectName:
            "Autopilot-Entwurf",

          /*
           * Upload-first:
           * Diese Felder werden später
           * automatisch aus Bildern,
           * Exposé und Dokumenten gefüllt.
           */
          location:
            "",

          propertyType:
            "",

          market,

          countryCode:
            market,

          paymentModel:
            usesSingleObjectPayment
              ? "single_object"
              : "subscription",

          unlockStatus:
            usesSingleObjectPayment
              ? "locked"
              : "included",
        },

        select: {
          id: true,
          projectName: true,
          market: true,
          countryCode: true,
          location: true,
          propertyType: true,
          paymentModel: true,
          unlockStatus: true,
          createdAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,

        listingId:
          listing.id,

        listing,

        autopilot: {
          stage:
            "draft_created",

          next:
            "upload",

          missingFields: [
            "location",
            "propertyType",
          ],
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "[autopilot/draft]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Autopilot-Entwurf konnte nicht erstellt werden.",
      },
      {
        status: 500,
      }
    );
  }
}