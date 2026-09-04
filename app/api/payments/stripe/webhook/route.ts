import { Buffer } from "node:buffer";

import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import {
  isInseratAiCurrency,
  type InseratAiCurrency,
} from "@/lib/inserat-ai-market";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  getSubscriptionEventObject,
  processFailedSubscriptionCheckout,
  processSubscriptionLifecycleEvent,
  processSuccessfulSubscriptionCheckout,
} from "@/lib/subscription-billing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WEBHOOK_BODY_BYTES =
  1024 * 1024;

type CheckoutMetadata = {
  listingId: string;
  userId: string;
  expectedAmountCents: number;
  expectedCurrency: InseratAiCurrency;
};

class PayloadTooLargeError extends Error {
  constructor() {
    super("Stripe-Webhook-Payload ist zu gross.");
    this.name = "PayloadTooLargeError";
  }
}

function getExpectedStripeLiveMode(): boolean {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (secretKey?.startsWith("sk_live_")) {
    return true;
  }

  if (secretKey?.startsWith("sk_test_")) {
    return false;
  }

  throw new Error(
    "STRIPE_SECRET_KEY besitzt kein gültiges Format."
  );
}

async function readRawBodyWithLimit(
  request: Request
): Promise<Buffer> {
  const contentLengthHeader =
    request.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength =
      Number(contentLengthHeader);

    if (
      !Number.isSafeInteger(contentLength) ||
      contentLength < 0
    ) {
      throw new Error(
        "Ungültige Content-Length."
      );
    }

    if (
      contentLength >
      MAX_WEBHOOK_BODY_BYTES
    ) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    return Buffer.alloc(0);
  }

  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;

      if (
        totalBytes >
        MAX_WEBHOOK_BODY_BYTES
      ) {
        await reader
          .cancel()
          .catch(() => undefined);

        throw new PayloadTooLargeError();
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(
    chunks,
    totalBytes
  );
}

function getCheckoutSession(
  event: Stripe.Event
): Stripe.Checkout.Session {
  const session =
    event.data.object as
      Stripe.Checkout.Session;

  if (
    session.object !==
      "checkout.session" ||
    !session.id
  ) {
    throw new Error(
      "Das Stripe-Ereignis enthält keine gültige Checkout-Sitzung."
    );
  }

  return session;
}

function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | null {
  const paymentIntent =
    session.payment_intent;

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

  if (!isInseratAiCurrency(expectedCurrency)) {
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
    expectedCurrency,
  };
}

function validateCheckoutSession(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  metadata: CheckoutMetadata
): void {
  const expectedLiveMode =
    getExpectedStripeLiveMode();

  if (
    event.livemode !== expectedLiveMode ||
    session.livemode !== expectedLiveMode ||
    session.livemode !== event.livemode
  ) {
    throw new Error(
      "Stripe-Testmodus und Produktionsmodus stimmen nicht überein."
    );
  }

  if (session.mode !== "payment") {
    throw new Error(
      "Der Stripe-Checkout-Modus ist ungültig."
    );
  }

  if (
    session.client_reference_id !==
    metadata.listingId
  ) {
    throw new Error(
      "Stripe-Referenz und Objekt-ID stimmen nicht überein."
    );
  }

  if (
    session.currency?.toLowerCase() !==
    metadata.expectedCurrency
  ) {
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

function validateEventSessionState(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): void {
  switch (event.type) {
    case "checkout.session.completed": {
      if (session.status !== "complete") {
        throw new Error(
          "Die abgeschlossene Checkout-Sitzung besitzt einen ungültigen Status."
        );
      }

      if (
        session.payment_status !== "paid" &&
        session.payment_status !== "unpaid"
      ) {
        throw new Error(
          "Die abgeschlossene Checkout-Sitzung besitzt einen ungültigen Zahlungsstatus."
        );
      }

      return;
    }

    case "checkout.session.async_payment_succeeded": {
      if (
        session.status !== "complete" ||
        session.payment_status !== "paid"
      ) {
        throw new Error(
          "Die erfolgreiche verzögerte Zahlung besitzt einen ungültigen Status."
        );
      }

      return;
    }

    case "checkout.session.expired": {
      if (
        session.status !== "expired" ||
        session.payment_status === "paid"
      ) {
        throw new Error(
          "Die abgelaufene Checkout-Sitzung besitzt einen ungültigen Status."
        );
      }

      return;
    }

    case "checkout.session.async_payment_failed": {
      if (
        session.status !== "complete" ||
        session.payment_status === "paid"
      ) {
        throw new Error(
          "Die fehlgeschlagene verzögerte Zahlung besitzt einen ungültigen Status."
        );
      }

      return;
    }

    default:
      throw new Error(
        "Nicht unterstützter Stripe-Ereignistyp."
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
  const metadata =
    readCheckoutMetadata(session);

  validateCheckoutSession(
    event,
    session,
    metadata
  );

  validateEventSessionState(
    event,
    session
  );

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
            stripeCheckoutSessionId:
              session.id,
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

      /*
       * Stripe-Ereignisse können in einer anderen
       * Reihenfolge eintreffen. Ein bereits bezahltes
       * Objekt wird niemals zurückgestuft.
       */
      if (
        listing.unlockStatus === "paid"
      ) {
        await transaction
          .stripeWebhookEvent
          .update({
            where: {
              eventId: event.id,
            },
            data: {
              outcome: "already_paid",
            },
          });

        return;
      }

      /*
       * checkout.session.completed kann bei
       * verzögerten Zahlungsarten eintreffen, bevor
       * das Geld verfügbar ist.
       */
      if (
        session.payment_status !== "paid"
      ) {
        await transaction
          .stripeWebhookEvent
          .update({
            where: {
              eventId: event.id,
            },
            data: {
              outcome:
                "waiting_for_payment",
            },
          });

        return;
      }

      const result =
        await transaction.listing.updateMany({
          where: {
            id: listing.id,
            userId: metadata.userId,
            stripeCheckoutSessionId:
              session.id,
            unlockStatus: {
              not: "paid",
            },
          },
          data: {
            paymentModel:
              "single_object",
            unlockStatus: "paid",
            stripePaymentIntentId:
              getPaymentIntentId(session),
            paidAt: new Date(
              event.created * 1000
            ),
          },
        });

      if (result.count !== 1) {
        throw new Error(
          "Das Objekt konnte nicht eindeutig freigeschaltet werden."
        );
      }

      await transaction
        .stripeWebhookEvent
        .update({
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
  const metadata =
    readCheckoutMetadata(session);

  validateCheckoutSession(
    event,
    session,
    metadata
  );

  validateEventSessionState(
    event,
    session
  );

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
            stripeCheckoutSessionId:
              session.id,
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

      await transaction
        .stripeWebhookEvent
        .update({
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

export async function POST(
  request: Request
) {
  const webhookSecret =
    process.env
      .STRIPE_WEBHOOK_SECRET
      ?.trim();

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET fehlt."
    );

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
    request.headers.get(
      "stripe-signature"
    );

  if (!signature) {
    return NextResponse.json(
      {
        received: false,
        error: "Stripe-Signatur fehlt.",
      },
      { status: 400 }
    );
  }

  let rawBody: Buffer;

  try {
    rawBody =
      await readRawBodyWithLimit(request);
  } catch (error) {
    if (
      error instanceof
      PayloadTooLargeError
    ) {
      return NextResponse.json(
        {
          received: false,
          error:
            "Stripe-Webhook-Payload ist zu gross.",
        },
        { status: 413 }
      );
    }

    console.error(
      "STRIPE WEBHOOK BODY ERROR:",
      error
    );

    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe-Webhook-Payload ist ungültig.",
      },
      { status: 400 }
    );
  }

  if (rawBody.byteLength === 0) {
    return NextResponse.json(
      {
        received: false,
        error:
          "Stripe-Webhook-Payload fehlt.",
      },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
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
    const expectedLiveMode =
      getExpectedStripeLiveMode();

    if (
      event.livemode !==
      expectedLiveMode
    ) {
      throw new Error(
        "Stripe-Event und Stripe-Schlüssel verwenden unterschiedliche Modi."
      );
    }

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session =
          getCheckoutSession(event);

        if (
          session.mode === "subscription" ||
          session.metadata?.paymentModel ===
            "subscription"
        ) {
          await processSuccessfulSubscriptionCheckout(
            event,
            session
          );
        } else {
          await processSuccessfulCheckout(
            event,
            session
          );
        }

        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        const session =
          getCheckoutSession(event);

        if (
          session.mode === "subscription" ||
          session.metadata?.paymentModel ===
            "subscription"
        ) {
          await processFailedSubscriptionCheckout(
            event,
            session
          );
        } else {
          await processFailedCheckout(
            event,
            session
          );
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await processSubscriptionLifecycleEvent(
          event,
          getSubscriptionEventObject(event)
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
     * Bereits verarbeitete Ereignisse werden
     * bestätigt, aber niemals erneut ausgeführt.
     */
    if (isDuplicateEventError(error)) {
      const existingEvent =
        await prisma
          .stripeWebhookEvent
          .findUnique({
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
        eventLivemode:
          event.livemode,
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
