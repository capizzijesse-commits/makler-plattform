import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  deleteUserSession,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    await deleteUserSession(token);

    const response = NextResponse.json({
      success: true,
      message: "Du wurdest erfolgreich ausgeloggt.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("LOGOUT API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Logout fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}