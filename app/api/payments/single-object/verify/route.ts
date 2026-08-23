import type Stripe from "stripe";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ID_LENGTH = 128;

type VerifyRequestBody = {
  listingId?: unknown;
  sessionId?: unknown;
};

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
          error: "Bitte zuerst einloggen.",
        },
        { status: 401 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as
      | VerifyRequestBody
      | null;

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    const sessionId =
      typeof body?.sessionId === "string"
        ? body.sessionId.trim()
        : "";

    if (
      !listingId ||
      !sessionId ||
      listingId.length > MAX_ID_LENGTH ||
      sessionId.length > MAX_ID_LENGTH ||
      !sessionId.startsWith("cs_")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Zahlungsreferenz ist ungültig.",
        },
        { status: 400 }
      );
    }

    const listing =
      await prisma.listing.findFirst({
        where: {
          id: listingId,
          userId: user.id,
          archivedAt: null,
        },
        select: {
          id: true,
          paymentModel: true,
          unlockStatus: true,
          paidAt: true,
          singleObjectPriceCents: true,
          stripeCheckoutSessionId: true,
        },
      });

    if (!listing) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die aktive Immobilie wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }



    if (
      listing.paymentModel !==
        "single_object" ||
      listing.stripeCheckoutSessionId !==
        sessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Die Zahlung gehört nicht zu dieser Immobilie.",
        },
        { status: 409 }
      );
    }

    const stripe = getStripe();

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    const metadataAmount = Number(
      session.metadata?.expectedAmountCents
    );

    const expectedLiveMode =
      getExpectedStripeLiveMode();

    const isValid =
      session.mode === "payment" &&
      session.status === "complete" &&
      session.payment_status === "paid" &&
      session.client_reference_id ===
        listing.id &&
      session.metadata?.listingId ===
        listing.id &&
      session.metadata?.userId === user.id &&
      session.metadata?.paymentModel ===
        "single_object" &&
      session.metadata?.expectedCurrency
        ?.toLowerCase() === "chf" &&
      Number.isInteger(metadataAmount) &&
      metadataAmount ===
        listing.singleObjectPriceCents &&
      session.currency?.toLowerCase() ===
        "chf" &&
      session.amount_total ===
        listing.singleObjectPriceCents &&
      session.livemode === expectedLiveMode;

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          paymentProcessing:
            session.payment_status !== "paid",
          error:
            "Die Zahlung ist noch nicht vollständig bestätigt.",
        },
        { status: 409 }
      );
    }
if (
  listing.unlockStatus === "paid" &&
  listing.paidAt
) {
  return NextResponse.json({
    success: true,
    alreadyUnlocked: true,
    unlockStatus: "paid",
    livemode: session.livemode,
    verifiedSessionId: session.id,
  });
}
    const paymentIntentId =
      getPaymentIntentId(session);

    const updated =
      await prisma.listing.updateMany({
        where: {
          id: listing.id,
          userId: user.id,
          archivedAt: null,
          paymentModel: "single_object",
          stripeCheckoutSessionId:
            session.id,
          singleObjectPriceCents:
            listing.singleObjectPriceCents,
          unlockStatus: {
            not: "paid",
          },
        },
        data: {
          unlockStatus: "paid",
          paidAt: new Date(),
          stripePaymentIntentId:
            paymentIntentId,
        },
      });

    if (updated.count !== 1) {
      const latest =
        await prisma.listing.findFirst({
          where: {
            id: listing.id,
            userId: user.id,
          },
          select: {
            unlockStatus: true,
            paidAt: true,
          },
        });

      if (
        latest?.unlockStatus === "paid" &&
        latest.paidAt
      ) {
        return NextResponse.json({
  success: true,
  alreadyUnlocked: true,
  unlockStatus: "paid",
  livemode: session.livemode,
  verifiedSessionId: session.id,
});
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Die Freischaltung konnte nicht eindeutig gespeichert werden.",
        },
        { status: 409 }
      );
    }

   return NextResponse.json({
  success: true,
  alreadyUnlocked: false,
  unlockStatus: "paid",
  livemode: session.livemode,
  verifiedSessionId: session.id,
});
  } catch (error) {
    console.error(
      "STRIPE PAYMENT VERIFY ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Die Zahlung konnte momentan nicht geprüft werden.",
      },
      { status: 500 }
    );
  }
}
