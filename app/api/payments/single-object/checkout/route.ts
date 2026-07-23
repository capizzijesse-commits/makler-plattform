import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

const MIN_PRICE_CENTS = 100;
const MAX_PRICE_CENTS = 100_000;
const MAX_ID_LENGTH = 128;

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

    const body = (await request
      .json()
      .catch(() => null)) as CheckoutRequestBody | null;

    const listingId =
      typeof body?.listingId === "string"
        ? body.listingId.trim()
        : "";

    if (
      !listingId ||
      listingId.length > MAX_ID_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Die Objekt-ID fehlt oder ist ungültig.",
        },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
        propertyType: true,
        location: true,
        unlockStatus: true,
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

    const priceCents =
      listing.singleObjectPriceCents;

    if (
      !Number.isInteger(priceCents) ||
      priceCents < MIN_PRICE_CENTS ||
      priceCents > MAX_PRICE_CENTS
    ) {
      console.error(
        "UNGÜLTIGER EINZELOBJEKT-PREIS:",
        {
          listingId: listing.id,
          priceCents,
        }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Der Preis für diese Immobilie ist momentan nicht gültig.",
        },
        { status: 500 }
      );
    }

    const stripe = getStripe();

    /*
     * Eine bereits offene Checkout-Sitzung wird erneut
     * verwendet, statt einen zweiten Zahlungsvorgang zu
     * erzeugen.
     */
    if (
      listing.unlockStatus === "pending" &&
      listing.stripeCheckoutSessionId
    ) {
      try {
        const existingSession =
          await stripe.checkout.sessions.retrieve(
            listing.stripeCheckoutSessionId
          );

        if (
          existingSession.status === "open" &&
          existingSession.url
        ) {
          return NextResponse.json({
            success: true,
            checkoutUrl: existingSession.url,
            reusedSession: true,
          });
        }

        if (
          existingSession.payment_status === "paid"
        ) {
          return NextResponse.json(
            {
              success: false,
              paymentProcessing: true,
              error:
                "Die Zahlung wurde bereits abgeschlossen und wird verarbeitet.",
            },
            { status: 409 }
          );
        }
      } catch (error) {
        /*
         * Eine nicht mehr verfügbare alte Sitzung soll
         * keinen neuen Zahlungsversuch blockieren.
         */
        console.error(
          "ALTE CHECKOUT-SITZUNG KONNTE NICHT GELADEN WERDEN:",
          error
        );
      }
    }

    const appUrl = getAppUrl(request.url);

    /*
     * Doppelte Klicks und parallele Anfragen innerhalb
     * derselben Minute verwenden denselben Stripe-Vorgang.
     */
    const checkoutMinute =
      Math.floor(Date.now() / 60_000);

    const idempotencyKey =
      `single-object:${listing.id}:${checkoutMinute}`;

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",
          client_reference_id: listing.id,
          customer_email: user.email,

          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: "chf",
                unit_amount: priceCents,
                product_data: {
                  name:
                    "Inserat-AI Einzelimmobilie",
                  description:
                    `${listing.propertyType} in ${listing.location}`
                      .slice(0, 500),
                },
              },
            },
          ],

          metadata: {
            listingId: listing.id,
            userId: user.id,
            paymentModel: "single_object",
            expectedAmountCents:
              String(priceCents),
            expectedCurrency: "chf",
          },

          payment_intent_data: {
            metadata: {
              listingId: listing.id,
              userId: user.id,
              paymentModel: "single_object",
            },
          },

          success_url:
            `${appUrl}/cockpit/${listing.id}` +
            "?payment=success" +
            "&session_id={CHECKOUT_SESSION_ID}",

          cancel_url:
            `${appUrl}/cockpit/${listing.id}` +
            "?payment=cancelled",

          locale: "de",
        },
        {
          idempotencyKey,
        }
      );

    if (!session.url) {
      throw new Error(
        "Stripe hat keine Checkout-Adresse geliefert."
      );
    }

    const updatedListing =
      await prisma.listing.updateMany({
        where: {
          id: listing.id,
          userId: user.id,
          unlockStatus: {
            notIn: ["included", "paid"],
          },
        },
        data: {
          paymentModel: "single_object",
          unlockStatus: "pending",
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: null,
        },
      });

    if (updatedListing.count !== 1) {
      /*
       * Wurde das Objekt zwischenzeitlich freigeschaltet,
       * darf die neue Sitzung nicht weiterverwendet werden.
       */
      await stripe.checkout.sessions
        .expire(session.id)
        .catch(() => undefined);

      return NextResponse.json(
        {
          success: false,
          error:
            "Der Zahlungsstatus der Immobilie hat sich bereits geändert.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      reusedSession: false,
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
