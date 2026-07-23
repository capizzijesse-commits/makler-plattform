import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutMetadata = {
  listingId: string;
  userId: string;
  expectedAmountCents: number;
};

function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | null {
  const paymentIntent = session.payment_intent;

  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent?.id ?? null;
}

function readCheckoutMetadata(
  session: Stripe.Checkout.Session
): CheckoutMetadata {
  const listingId =
    session.metadata?.listingId?.trim() ?? "";

  const userId =
    session.metadata?.userId?.trim() ?? "";

  const paymentModel =
    session.metadata?.paymentModel?.trim() ?? "";

  const expectedCurrency =
    session.metadata?.expectedCurrency
      ?.trim()
      .toLowerCase() ?? "";

  const expectedAmountCents = Number(
    session.metadata?.expectedAmountCents
  );

  if (
    !listingId ||
    !userId ||
    listingId.length > 128 ||
    userId.length > 128
  ) {
    throw new Error(
      "Ungültige Stripe-Objekt- oder Benutzer-ID."
    );
  }

  if (paymentModel !== "single_object") {
    throw new Error(
      "Ungültiges Stripe-Zahlungsmodell."
    );
  }

  if (expectedCurrency !== "chf") {
    throw new Error(
      "Ungültige erwartete Stripe-Währung."
    );
  }

  if (
    !Number.isInteger(expectedAmountCents) ||
    expectedAmountCents <= 0
  ) {
    throw new Error(
      "Ungültiger erwarteter Stripe-Betrag."
    );
  }

  return {
    listingId,
    userId,
    expectedAmountCents,
  };
}

function validateCheckoutSession(
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata
): void {
  if (session.mode !== "payment") {
    throw new Error(
      "Der Stripe-Checkout-Modus ist ungültig."
    );
  }

  if (
    session.client_reference_id !== metadata.listingId
  ) {
    throw new Error(
      "Stripe-Referenz und Objekt-ID stimmen nicht überein."
    );
  }

  if (session.currency?.toLowerCase() !== "chf") {
    throw new Error(
      "Die Stripe-Währung ist ungültig."
    );
  }

  if (
    session.amount_total !==
    metadata.expectedAmountCents
  ) {
    throw new Error(
      "Der Stripe-Betrag stimmt nicht überein."
    );
  }
}

async function createEventRecord(
  transaction: Prisma.TransactionClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  outcome: string
): Promise<void> {
  await transaction.stripeWebhookEvent.create({
    data: {
      eventId: event.id,
      eventType: event.type,
      stripeSessionId: session.id,
      outcome,
      livemode: event.livemode,
      stripeCreatedAt: new Date(
        event.created * 1000
      ),
    },
  });
}

async function processSuccessfulCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata = readCheckoutMetadata(session);

  validateCheckoutSession(session, metadata);

  /*
   * Nur tatsächlich bezahlte Sitzungen freischalten.
   * Bei verzögerten Zahlungsarten warten wir auf
   * checkout.session.async_payment_succeeded.
   */
  if (session.payment_status !== "paid") {
    await prisma.$transaction(
      async (transaction) => {
        await createEventRecord(
          transaction,
          event,
          session,
          "waiting_for_payment"
        );
      }
    );

    return;
  }

  await prisma.$transaction(
    async (transaction) => {
      await createEventRecord(
        transaction,
        event,
        session,
        "processing"
      );

      const listing =
        await transaction.listing.findFirst({
          where: {
            id: metadata.listingId,
            userId: metadata.userId,
            stripeCheckoutSessionId: session.id,
          },
          select: {
            id: true,
            unlockStatus: true,
            singleObjectPriceCents: true,
          },
        });

      if (!listing) {
        throw new Error(
          "Kein passendes Objekt für die Stripe-Sitzung gefunden."
        );
      }

      if (
        listing.singleObjectPriceCents !==
        metadata.expectedAmountCents
      ) {
        throw new Error(
          "Objektpreis und Stripe-Betrag stimmen nicht überein."
        );
      }

      if (listing.unlockStatus === "paid") {
        await transaction.stripeWebhookEvent.update({
          where: {
            eventId: event.id,
          },
          data: {
            outcome: "already_paid",
          },
        });

        return;
      }

      const result =
        await transaction.listing.updateMany({
          where: {
            id: listing.id,
            userId: metadata.userId,
            stripeCheckoutSessionId: session.id,
            unlockStatus: {
              not: "paid",
            },
          },
          data: {
            paymentModel: "single_object",
            unlockStatus: "paid",
            stripePaymentIntentId:
              getPaymentIntentId(session),
            paidAt: new Date(event.created * 1000),
          },
        });

      if (result.count !== 1) {
        throw new Error(
          "Das Objekt konnte nicht eindeutig freigeschaltet werden."
        );
      }

      await transaction.stripeWebhookEvent.update({
        where: {
          eventId: event.id,
        },
        data: {
          outcome: "paid",
        },
      });
    }
  );
}

async function processFailedCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata = readCheckoutMetadata(session);

  validateCheckoutSession(session, metadata);

  await prisma.$transaction(
    async (transaction) => {
      await createEventRecord(
        transaction,
        event,
        session,
        "processing"
      );

      const result =
        await transaction.listing.updateMany({
          where: {
            id: metadata.listingId,
            userId: metadata.userId,
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

      await transaction.stripeWebhookEvent.update({
        where: {
          eventId: event.id,
        },
        data: {
          outcome:
            result.count === 1
              ? "checkout_reset"
              : "ignored_stale_or_paid",
        },
      });
    }
  );
}

function isDuplicateEventError(
  error: unknown
): boolean {
  return (
    error instanceof
      Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET fehlt.");

    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe-Webhook ist nicht konfiguriert.",
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
        await processSuccessfulCheckout(
          event,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        await processFailedCheckout(
          event,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      }

      default:
        return NextResponse.json({
          received: true,
          ignored: true,
        });
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    /*
     * Bereits verarbeitete Stripe-Ereignisse werden
     * bestätigt, aber nicht ein zweites Mal ausgeführt.
     */
    if (isDuplicateEventError(error)) {
      const existingEvent =
        await prisma.stripeWebhookEvent.findUnique({
          where: {
            eventId: event.id,
          },
          select: {
            eventId: true,
          },
        });

      if (existingEvent) {
        return NextResponse.json({
          received: true,
          duplicate: true,
        });
      }
    }

    console.error(
      "STRIPE WEBHOOK PROCESSING ERROR:",
      {
        eventId: event.id,
        eventType: event.type,
        error,
      }
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
