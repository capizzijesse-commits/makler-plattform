import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/session";

import {
  getCustomerPortalAccessSummaries,
  saveCustomerPortalAccessForUser,
} from "@/lib/portal-integrations/customer-portal-access.server";


export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";


function isSameOrigin(
  request: NextRequest
): boolean {

  const origin =
    request.headers.get("origin");

  if (!origin) {
    return false;
  }

  try {
    return (
      new URL(origin).origin ===
      request.nextUrl.origin
    );
  }
  catch {
    return false;
  }
}


export async function GET(
  request: NextRequest
): Promise<NextResponse> {

  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
      },
      {
        status: 401,
      }
    );
  }


  const accesses =
    await getCustomerPortalAccessSummaries(
      user.id
    );


  return NextResponse.json({
    success: true,
    accesses,
  });
}


export async function POST(
  request: NextRequest
): Promise<NextResponse> {

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_ORIGIN",
      },
      {
        status: 403,
      }
    );
  }


  const user =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
      },
      {
        status: 401,
      }
    );
  }


  try {

    const body: unknown =
      await request.json();


    const access =
      await saveCustomerPortalAccessForUser(
        user.id,
        body
      );


    /*
     * Keine Secrets werden
     * an den Browser zurückgegeben.
     *
     * configured bedeutet nur:
     * sicher gespeichert.
     *
     * verified folgt erst nach
     * technischem Verbindungstest.
     */
    return NextResponse.json({
      success: true,
      access,
    });
  }
  catch (error) {

    console.error(
      "Customer portal access setup failed:",
      error instanceof Error
        ? error.message
        : "unknown"
    );


    return NextResponse.json(
      {
        success: false,
        error:
          "CUSTOMER_PORTAL_ACCESS_INVALID",
      },
      {
        status: 400,
      }
    );
  }
}