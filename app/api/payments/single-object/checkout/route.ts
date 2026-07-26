import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
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

const CHECKOUT_CLAIM_PREFIX = "creating:";
const CHECKOUT_CLAIM_MAX_AGE_MS =
  10 * 60 * 1000;

type CheckoutRequestBody = {
  listingId?: unknown;
};

type CheckoutClaim = {
  value: string;
  createdAtMs: number;
  priceCents: number;
};

function createCheckoutClaim(
  priceCents: number
): CheckoutClaim {
  const createdAtMs = Date.now();

  return {
    value:
      `${CHECKOUT_CLAIM_PREFIX}` +
      `${createdAtMs}:` +
      `${priceCents}:` +
      randomUUID(),
    createdAtMs,
    priceCents,
  };
}

function readCheckoutClaim(
  value: string
): CheckoutClaim | null {
  if (!value.startsWith(CHECKOUT_CLAIM_PREFIX)) {
    return null;
  }

  const parts = value.split(":");

  if (parts.length !== 4) {
    return null;
  }

  const createdAtMs = Number(parts[1]);
  const priceCents = Number(parts[2]);
  const attemptId = parts[3];

  if (
    !Number.isSafeInteger(createdAtMs) ||
    createdAtMs <= 0 ||
    !Number.isInteger(priceCents) ||
    priceCents <= 0 ||
    !attemptId ||
    attemptId.length > 64
  ) {
    return null;
  }

  return {
    value,
    createdAtMs,
    priceCents,
  };
}

function isStaleClaim(
  claim: CheckoutClaim
): boolean {
  return (
    Date.now() - claim.createdAtMs >
    CHECKOUT_CLAIM_MAX_AGE_MS
  );
}

function getStripeErrorCode(
  error: unknown
): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string"
    ? code
    : null;
}

function getExpectedStripeLiveMode(): boolean {
  return (
    process.env.STRIPE_SECRET_KEY
      ?.trim()
      .startsWith("sk_live_") ?? false
  );
}

function validateStripeSession(
  session: Stripe.Checkout.Session,
  expected: {
    listingId: string;
    userId: string;
    priceCents: number;
  }
): void {
  const metadataAmount = Number(
    session.metadata?.expectedAmountCents
  );

  if (session.mode !== "payment") {
    throw new Error(
      "Der Stripe-Checkout-Modus ist ungültig."
    );
  }

  if (
    session.client_reference_id !==
    expected.listingId
  ) {
    throw new Error(
      "Stripe-Referenz und Objekt-ID stimmen nicht überein."
    );
  }

  if (
    session.metadata?.listingId !==
      expected.listingId ||
    session.metadata?.userId !==
      expected.userId ||
    session.metadata?.paymentModel !==
      "single_object"
  ) {
    throw new Error(
      "Die Stripe-Metadaten stimmen nicht mit dem Objekt überein."
    );
  }

  if (
    session.metadata?.expectedCurrency
      ?.toLowerCase() !== "chf"
  ) {
    throw new Error(
      "Die erwartete Stripe-Währung ist ungültig."
    );
  }

  if (
    !Number.isInteger(metadataAmount) ||
    metadataAmount !== expected.priceCents
  ) {
    throw new Error(
      "Der erwartete Stripe-Betrag ist ungültig."
    );
  }

  if (session.currency?.toLowerCase() !== "chf") {
    throw new Error(
      "Die Stripe-Währung ist ungültig."
    );
  }

  if (
    session.amount_total !==
    expected.priceCents
  ) {
    throw new Error(
      "Der Stripe-Betrag stimmt nicht überein."
    );
  }

  if (
    session.livemode !==
    getExpectedStripeLiveMode()
  ) {
    throw new Error(
      "Stripe-Testmodus und Produktionsmodus stimmen nicht überein."
    );
  }
}

function temporaryStripeError() {
  return NextResponse.json(
    {
      success: false,
      retryable: true,
      error:
        "Stripe ist vorübergehend nicht erreichbar. Bitte versuchen Sie es erneut.",
    },
    {
      status: 503,
      headers: {
        "Retry-After": "5",
      },
    }
  );
}

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
      .catch(() => null)) as
      | CheckoutRequestBody
      | null;

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
          error:
            "Die Objekt-ID fehlt oder ist ungültig.",
        },
        { status: 400 }
      );
    }

    let listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        userId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
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
    let claim: CheckoutClaim | null = null;

    /*
     * Eine gespeicherte Session wird nur wiederverwendet,
     * wenn ihre sicherheitsrelevanten Werte vollständig
     * mit Objekt, Benutzer und Datenbankpreis
     * übereinstimmen.
     */
    if (listing.stripeCheckoutSessionId) {
      const storedReference =
        listing.stripeCheckoutSessionId;

      const storedClaim =
        readCheckoutClaim(storedReference);

      if (storedClaim) {
        if (listing.unlockStatus !== "pending") {
          console.error(
            "INKONSISTENTE CHECKOUT-RESERVIERUNG:",
            {
              listingId: listing.id,
              unlockStatus:
                listing.unlockStatus,
            }
          );

          return NextResponse.json(
            {
              success: false,
              error:
                "Der Zahlungsstatus der Immobilie ist inkonsistent.",
            },
            { status: 409 }
          );
        }

        if (
          storedClaim.priceCents !== priceCents
        ) {
          if (isStaleClaim(storedClaim)) {
            await prisma.listing.updateMany({
              where: {
                id: listing.id,
                userId: user.id,
                archivedAt: null,
                unlockStatus: "pending",
                stripeCheckoutSessionId:
                  storedClaim.value,
              },
              data: {
                unlockStatus: "locked",
                stripeCheckoutSessionId: null,
                stripePaymentIntentId: null,
              },
            });
          }

          return NextResponse.json(
            {
              success: false,
              priceChanged: true,
              error:
                "Der Preis wurde geändert. Bitte starten Sie den Zahlungsvorgang erneut.",
            },
            { status: 409 }
          );
        }

        /*
         * Mehrere parallele Requests verwenden dieselbe
         * Reservierung und damit denselben Stripe-
         * Idempotency-Key.
         */
        claim = storedClaim;
      } else {
        let existingSession:
          | Stripe.Checkout.Session
          | null = null;

        try {
          existingSession =
            await stripe.checkout.sessions.retrieve(
              storedReference
            );
        } catch (error) {
          /*
           * Nur eine nachweislich nicht existierende
           * Session darf aus der Datenbank entfernt
           * werden. Netzwerk- und Stripe-Fehler führen
           * niemals vorsorglich zu einer neuen Session.
           */
          if (
            getStripeErrorCode(error) ===
            "resource_missing"
          ) {
            const cleared =
              await prisma.listing.updateMany({
                where: {
                  id: listing.id,
                  userId: user.id,
                  archivedAt: null,
                  stripeCheckoutSessionId:
                    storedReference,
                  unlockStatus: {
                    notIn: [
                      "included",
                      "paid",
                    ],
                  },
                },
                data: {
                  unlockStatus: "locked",
                  stripeCheckoutSessionId: null,
                  stripePaymentIntentId: null,
                },
              });

            if (cleared.count !== 1) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    "Der Zahlungsstatus hat sich bereits geändert.",
                },
                { status: 409 }
              );
            }

            listing = {
              ...listing,
              unlockStatus: "locked",
              stripeCheckoutSessionId: null,
            };
          } else {
            console.error(
              "CHECKOUT-SITZUNG KONNTE NICHT GELADEN WERDEN:",
              error
            );

            return temporaryStripeError();
          }
        }

        if (existingSession) {
          validateStripeSession(
            existingSession,
            {
              listingId: listing.id,
              userId: user.id,
              priceCents,
            }
          );

          if (
            existingSession.payment_status ===
            "paid"
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

          if (
            existingSession.status ===
            "complete"
          ) {
            return NextResponse.json(
              {
                success: false,
                paymentProcessing: true,
                error:
                  "Die Zahlung wird noch verarbeitet.",
              },
              { status: 409 }
            );
          }

          if (
            existingSession.status === "open"
          ) {
            if (!existingSession.url) {
              return temporaryStripeError();
            }

            return NextResponse.json({
              success: true,
              checkoutUrl:
                existingSession.url,
              reusedSession: true,
            });
          }

          if (
            existingSession.status ===
            "expired"
          ) {
            const cleared =
              await prisma.listing.updateMany({
                where: {
                  id: listing.id,
                  userId: user.id,
                  archivedAt: null,
                  stripeCheckoutSessionId:
                    existingSession.id,
                  unlockStatus: {
                    notIn: [
                      "included",
                      "paid",
                    ],
                  },
                },
                data: {
                  unlockStatus: "locked",
                  stripeCheckoutSessionId: null,
                  stripePaymentIntentId: null,
                },
              });

            if (cleared.count !== 1) {
              return NextResponse.json(
                {
                  success: false,
                  error:
                    "Der Zahlungsstatus hat sich bereits geändert.",
                },
                { status: 409 }
              );
            }

            listing = {
              ...listing,
              unlockStatus: "locked",
              stripeCheckoutSessionId: null,
            };
          } else {
            return temporaryStripeError();
          }
        }
      }
    }

    /*
     * Vor dem Stripe-Aufruf wird das Objekt atomar
     * reserviert. Nur eine Anfrage kann diese
     * Reservierung gewinnen.
     */
    if (!claim) {
      const newClaim =
        createCheckoutClaim(priceCents);

      const claimed =
        await prisma.listing.updateMany({
          where: {
            id: listing.id,
            userId: user.id,
            archivedAt: null,
            unlockStatus: {
              in: ["locked", "pending"],
            },
            stripeCheckoutSessionId: null,
            singleObjectPriceCents:
              priceCents,
          },
          data: {
            paymentModel: "single_object",
            unlockStatus: "pending",
            stripeCheckoutSessionId:
              newClaim.value,
            stripePaymentIntentId: null,
          },
        });

      if (claimed.count !== 1) {
        return NextResponse.json(
          {
            success: false,
            checkoutStarting: true,
            error:
              "Der Zahlungsvorgang wird bereits vorbereitet. Bitte versuchen Sie es erneut.",
          },
          { status: 409 }
        );
      }

      claim = newClaim;
    }

    const appUrl = getAppUrl(request.url);

    let session: Stripe.Checkout.Session;

    try {
      session =
        await stripe.checkout.sessions.create(
          {
            mode: "payment",
            client_reference_id: listing.id,
            customer_email: user.email,

            branding_settings: {
              display_name: "Inserat-AI",
            },

            adaptive_pricing: {
              enabled: false,
            },

            line_items: [
              {
                quantity: 1,
                price_data: {
                  currency: "chf",
                  unit_amount:
                    claim.priceCents,
                  product_data: {
                    name:
                      "Inserat-AI Einzelimmobilie",
                    description:
                      "Einmalige Freischaltung einer Immobilie",
                  },
                },
              },
            ],

            metadata: {
              listingId: listing.id,
              userId: user.id,
              paymentModel:
                "single_object",
              expectedAmountCents:
                String(claim.priceCents),
              expectedCurrency: "chf",
            },

            payment_intent_data: {
              metadata: {
                listingId: listing.id,
                userId: user.id,
                paymentModel:
                  "single_object",
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
            idempotencyKey:
              `single-object:${listing.id}:` +
              claim.value,
          }
        );
    } catch (error) {
      console.error(
        "STRIPE CHECKOUT CREATE ERROR:",
        error
      );

      /*
       * Bei einer alten, wiederholt fehlgeschlagenen
       * Reservierung wird ein neuer Versuch vorbereitet.
       * Eine möglicherweise erzeugte alte Session war
       * noch nie für den Benutzer erreichbar.
       */
      if (isStaleClaim(claim)) {
        const replacement =
          createCheckoutClaim(priceCents);

        await prisma.listing.updateMany({
          where: {
            id: listing.id,
            userId: user.id,
            archivedAt: null,
            unlockStatus: "pending",
            stripeCheckoutSessionId:
              claim.value,
          },
          data: {
            stripeCheckoutSessionId:
              replacement.value,
            stripePaymentIntentId: null,
          },
        });
      }

      return temporaryStripeError();
    }

    try {
      validateStripeSession(session, {
        listingId: listing.id,
        userId: user.id,
        priceCents: claim.priceCents,
      });
    } catch (error) {
      if (session.status === "open") {
        await stripe.checkout.sessions
          .expire(session.id)
          .catch(() => undefined);
      }

      await prisma.listing.updateMany({
        where: {
          id: listing.id,
          userId: user.id,
          archivedAt: null,
          unlockStatus: "pending",
          stripeCheckoutSessionId:
            claim.value,
        },
        data: {
          unlockStatus: "locked",
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
        },
      });

      throw error;
    }

    if (
      session.status === "expired"
    ) {
      await prisma.listing.updateMany({
        where: {
          id: listing.id,
          userId: user.id,
          archivedAt: null,
          unlockStatus: "pending",
          stripeCheckoutSessionId:
            claim.value,
        },
        data: {
          unlockStatus: "locked",
          stripeCheckoutSessionId: null,
          stripePaymentIntentId: null,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error:
            "Die Zahlungsseite ist abgelaufen. Bitte starten Sie den Vorgang erneut.",
        },
        { status: 409 }
      );
    }

    /*
     * Die echte Stripe-Session-ID ersetzt nur exakt
     * die Reservierung, aus der sie erzeugt wurde.
     */
    const finalized =
      await prisma.listing.updateMany({
        where: {
          id: listing.id,
          userId: user.id,
          archivedAt: null,
          unlockStatus: "pending",
          stripeCheckoutSessionId:
            claim.value,
          singleObjectPriceCents:
            claim.priceCents,
        },
        data: {
          paymentModel: "single_object",
          stripeCheckoutSessionId:
            session.id,
          stripePaymentIntentId: null,
        },
      });

    if (finalized.count !== 1) {
      const latestListing =
        await prisma.listing.findFirst({
          where: {
            id: listing.id,
            userId: user.id,
          },
          select: {
            unlockStatus: true,
            stripeCheckoutSessionId: true,
          },
        });

      /*
       * Eine parallele Anfrage kann dieselbe
       * idempotente Stripe-Session bereits gespeichert
       * haben. Das ist sicher und darf wiederverwendet
       * werden.
       */
      if (
        latestListing?.stripeCheckoutSessionId ===
        session.id
      ) {
        if (
          session.payment_status === "paid" ||
          session.status === "complete"
        ) {
          return NextResponse.json(
            {
              success: false,
              paymentProcessing: true,
              error:
                "Die Zahlung wird verarbeitet.",
            },
            { status: 409 }
          );
        }

        if (
          session.status === "open" &&
          session.url
        ) {
          return NextResponse.json({
            success: true,
            checkoutUrl: session.url,
            reusedSession: true,
          });
        }
      }

      if (
        session.status === "open" &&
        session.payment_status !== "paid"
      ) {
        await stripe.checkout.sessions
          .expire(session.id)
          .catch(() => undefined);
      }

      return NextResponse.json(
        {
          success: false,
          error:
            latestListing?.unlockStatus ===
              "included" ||
            latestListing?.unlockStatus ===
              "paid"
              ? "Diese Immobilie ist bereits freigeschaltet."
              : "Der Zahlungsstatus der Immobilie hat sich bereits geändert.",
        },
        { status: 409 }
      );
    }

    if (
      session.payment_status === "paid" ||
      session.status === "complete"
    ) {
      return NextResponse.json(
        {
          success: false,
          paymentProcessing: true,
          error:
            "Die Zahlung wurde abgeschlossen und wird verarbeitet.",
        },
        { status: 409 }
      );
    }

    if (
      session.status !== "open" ||
      !session.url
    ) {
      return temporaryStripeError();
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
