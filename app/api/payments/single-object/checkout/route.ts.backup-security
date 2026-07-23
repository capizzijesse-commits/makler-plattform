import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

type CheckoutRequestBody = {
  listingId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    const body =
      (await request.json()) as CheckoutRequestBody;

    const listingId =
      typeof body.listingId === "string"
        ? body.listingId.trim()
        : "";

    if (!listingId) {
      return NextResponse.json(
        {
          success: false,
          error: "Die Objekt-ID fehlt.",
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst({
        where: {
          id: listingId,
          userId: user.id,
        },
      });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error: "Die Immobilie wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    if (
      listing.unlockStatus === "included" ||
      listing.unlockStatus === "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          alreadyUnlocked: true,
          error:
            "Diese Immobilie ist bereits freigeschaltet.",
        },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    const origin = request.nextUrl.origin;

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: listing.id,
        customer_email: user.email,

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "chf",
              unit_amount:
                listing.singleObjectPriceCents,
              product_data: {
                name:
                  "Inserat-AI Einzelimmobilie",
                description:
                  `${listing.propertyType} in ${listing.location}`,
              },
            },
          },
        ],

        metadata: {
          listingId: listing.id,
          userId: user.id,
          paymentModel: "single_object",
        },

        payment_intent_data: {
          metadata: {
            listingId: listing.id,
            userId: user.id,
            paymentModel: "single_object",
          },
        },

        success_url:
          `${origin}/cockpit/${listing.id}` +
          "?payment=success" +
          "&session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${origin}/cockpit/${listing.id}` +
          "?payment=cancelled",

        locale: "de",
      });

    if (!session.url) {
      throw new Error(
        "Stripe hat keine Checkout-Adresse geliefert."
      );
    }

    await prisma.listing.update({
      where: {
        id: listing.id,
      },
      data: {
        paymentModel: "single_object",
        unlockStatus: "pending",
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error(
      "SINGLE OBJECT CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Zahlungsseite konnte nicht gestartet werden.",
      },
      { status: 500 }
    );
  }
}