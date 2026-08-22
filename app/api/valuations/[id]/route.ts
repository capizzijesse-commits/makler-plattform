import type {
  NextRequest,
} from "next/server";

import {
  NextResponse,
} from "next/server";

import {
  prisma,
} from "@/lib/prisma";

import {
  getAuthenticatedUser,
} from "@/lib/session";

export const runtime =
  "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
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

    const {
      id,
    } =
      await context.params;

    const valuationId =
      id.trim();

    if (!valuationId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ungültige Bewertung.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Wichtig:
     * id + userId verhindern,
     * dass fremde Bewertungen
     * geöffnet werden können.
     */
    const valuation =
      await prisma.valuation.findFirst({
        where: {
          id:
            valuationId,

          userId:
            user.id,
        },
      });

    if (!valuation) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Bewertung nicht gefunden.",
        },
        {
          status: 404,
        }
      );
    }

    const {
      userId:
        _userId,
      ...safeValuation
    } =
      valuation;

    return NextResponse.json({
      success: true,
      valuation:
        safeValuation,
    });
  } catch (error) {
    console.error(
      "[valuations/id]",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Bewertung konnte nicht geladen werden.",
      },
      {
        status: 500,
      }
    );
  }
}
