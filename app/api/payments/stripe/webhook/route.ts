import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | null {
  const paymentIntent = session.payment_intent;

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent?.id ?? null;
}

async function markListingAsPaid(
  session: Stripe.Checkout.Session
) {
  const listingId =
    session.metadata?.listingId?.trim();

  const userId =
    session.metadata?.userId?.trim();

  if (!listingId || !userId) {
    console.error(
      "STRIPE WEBHOOK: listingId oder userId fehlt.",
      session.id
    );
    return;
  }

  if (
    session.payment_status !== "paid" &&
    session.payment_status !== "no_payment_required"
  ) {
    return;
  }

  const result = await prisma.listing.updateMany({
    where: {
      id: listingId,
      userId,
      stripeCheckoutSessionId: session.id,
    },
    data: {
      paymentModel: "single_object",
      unlockStatus: "paid",
      stripePaymentIntentId:
        getPaymentIntentId(session),
      paidAt: new Date(),
    },
  });

  if (result.count === 0) {
    console.error(
      "STRIPE WEBHOOK: Keine passende Immobilie gefunden.",
      {
        listingId,
        userId,
        sessionId: session.id,
      }
    );
  }
}

async function resetFailedCheckout(
  session: Stripe.Checkout.Session
) {
  const listingId =
    session.metadata?.listingId?.trim();

  const userId =
    session.metadata?.userId?.trim();

  if (!listingId || !userId) {
    return;
  }

  await prisma.listing.updateMany({
    where: {
      id: listingId,
      userId,
      stripeCheckoutSessionId: session.id,
      unlockStatus: {
        not: "paid",
      },
    },
    data: {
      unlockStatus: "locked",
      stripeCheckoutSessionId: null,
      stripePaymentIntentId: null,
    },
  });
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET fehlt."
    );

    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe-Webhook ist noch nicht konfiguriert.",
      },
      { status: 500 }
    );
  }

  const signature =
    request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        received: false,
        error: "Stripe-Signatur fehlt.",
      },
      { status: 400 }
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error(
      "STRIPE WEBHOOK SIGNATURE ERROR:",
      error
    );

    return NextResponse.json(
      {
        received: false,
        error:
          "Ungültige Stripe-Webhook-Signatur.",
      },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        await markListingAsPaid(session);
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        await resetFailedCheckout(session);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "STRIPE WEBHOOK PROCESSING ERROR:",
      error
    );

    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe-Ereignis konnte nicht verarbeitet werden.",
      },
      { status: 500 }
    );
  }
}