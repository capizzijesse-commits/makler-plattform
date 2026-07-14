import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          authenticated: false,
          error: "Keine aktive Sitzung gefunden.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("SESSION API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
        error: "Die Sitzung konnte nicht geprüft werden.",
      },
      { status: 500 }
    );
  }
}