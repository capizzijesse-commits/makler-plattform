import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/session";
import {
  verifyAndActivateSubscriptionCheckout,
} from "@/lib/subscription-billing";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyPayload = {
  sessionId?: unknown;
};

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
            "Keine aktive Sitzung gefunden.",
        },
        {
          status: 401,
        }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as
      | VerifyPayload
      | null;

    const sessionId =
      typeof body?.sessionId === "string"
        ? body.sessionId.trim()
        : "";

    if (
      !sessionId ||
      sessionId.length > 255 ||
      !sessionId.startsWith("cs_")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Stripe-Checkout-ID ist ungültig.",
        },
        {
          status: 400,
        }
      );
    }

    const stripe = getStripe();

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    const result =
      await verifyAndActivateSubscriptionCheckout(
        session,
        user.id
      );

    return NextResponse.json({
      success: true,
      message:
        result.plan === "founder" &&
        result.founderNumber
          ? `Founder-Abonnement erfolgreich aktiviert. Du bist Founder Nr. ${result.founderNumber}.`
          : "Standard-Abonnement erfolgreich aktiviert.",
      plan: result.plan,
      founderNumber:
        result.founderNumber,
      subscriptionStatus:
        result.subscriptionStatus,
    });
  } catch (error) {
    console.error(
      "SUBSCRIPTION VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Das Abonnement konnte noch nicht bestätigt werden.",
      },
      {
        status: 500,
      }
    );
  }
}
