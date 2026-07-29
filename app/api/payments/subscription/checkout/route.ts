import type Stripe from "stripe";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import {
  OFFER_PRICES_CENTS,
  normalizeUserPlan,
} from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FOUNDER_LIMIT = 50;
const FOUNDER_TRIAL_DAYS = 30;

const LOCALE_COOKIE_NAME = "INSERAT_AI_LOCALE";

const FOUNDER_PRODUCT_DESCRIPTIONS = {
  de: "30 Tage kostenlos, danach CHF 19.90 pro Monat – monatlich kündbar.",
  it: "30 giorni gratuiti, poi CHF 19.90 al mese – disdetta mensile.",
  fr: "30 jours gratuits, puis CHF 19.90 par mois – résiliable chaque mois.",
  en: "30 days free, then CHF 19.90 per month – cancel monthly.",
} as const;

const ACTIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
];

type CheckoutRequestBody = {
  plan?: unknown;
};

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

async function clearMissingCustomer(
  userId: string,
  customerId: string
) {
  await prisma.user.updateMany({
    where: {
      id: userId,
      stripeCustomerId: customerId,
    },
    data: {
      stripeCustomerId: null,
    },
  });
}

async function getOrCreateCustomer(
  stripe: ReturnType<typeof getStripe>,
  user: {
    id: string;
    name: string;
    email: string;
    stripeCustomerId: string | null;
  }
): Promise<string> {
  const storedCustomerId =
    user.stripeCustomerId?.trim() ?? "";

  if (storedCustomerId) {
    try {
      const storedCustomer =
        await stripe.customers.retrieve(
          storedCustomerId
        );

      if (!storedCustomer.deleted) {
        const metadataUserId =
          storedCustomer.metadata?.userId;

        if (
          metadataUserId &&
          metadataUserId !== user.id
        ) {
          throw new Error(
            "Der Stripe-Kunde gehört nicht zu diesem Benutzerkonto."
          );
        }

        return storedCustomer.id;
      }

      await clearMissingCustomer(
        user.id,
        storedCustomerId
      );
    } catch (error) {
      if (
        getStripeErrorCode(error) !==
        "resource_missing"
      ) {
        throw error;
      }

      await clearMissingCustomer(
        user.id,
        storedCustomerId
      );
    }
  }

  const createdCustomer =
    await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        source: "inserat-ai",
      },
    });

  const claimed =
    await prisma.user.updateMany({
      where: {
        id: user.id,
        stripeCustomerId: null,
      },
      data: {
        stripeCustomerId:
          createdCustomer.id,
      },
    });

  if (claimed.count === 1) {
    return createdCustomer.id;
  }

  const latestUser =
    await prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        stripeCustomerId: true,
      },
    });

  if (latestUser?.stripeCustomerId) {
    /*
     * Eine parallele Anfrage war schneller.
     * Der überzählige Stripe-Kunde wird entfernt.
     */
    await stripe.customers
      .del(createdCustomer.id)
      .catch(() => undefined);

    return latestUser.stripeCustomerId;
  }

  throw new Error(
    "Der Stripe-Kunde konnte nicht eindeutig gespeichert werden."
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const authenticatedUser =
      await getAuthenticatedUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        {
          success: false,
          loginRequired: true,
          error:
            "Bitte zuerst einloggen oder registrieren.",
        },
        { status: 401 }
      );
    }

    if (!authenticatedUser.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          verificationRequired: true,
          error:
            "Bitte bestätige zuerst deine E-Mail-Adresse.",
        },
        { status: 403 }
      );
    }

    const body = (await request
      .json()
      .catch(() => null)) as
      | CheckoutRequestBody
      | null;

    const requestedPlan =
      typeof body?.plan === "string"
        ? body.plan.trim().toLowerCase()
        : "";

    if (requestedPlan !== "founder") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das gewählte Abonnement ist ungültig.",
        },
        { status: 400 }
      );
    }

    const billingUser =
      await prisma.user.findUnique({
        where: {
          id: authenticatedUser.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          emailVerified: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          founderNumber: true,
        },
      });

    if (!billingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Das Benutzerkonto wurde nicht gefunden.",
        },
        { status: 404 }
      );
    }

    const currentPlan =
      normalizeUserPlan(billingUser.plan);

    if (
      currentPlan === "founder" ||
      currentPlan === "pro" ||
      currentPlan === "agency" ||
      currentPlan === "admin"
    ) {
      return NextResponse.json(
        {
          success: false,
          alreadySubscribed: true,
          error:
            "Dein Konto besitzt bereits einen Makler-Plan.",
        },
        { status: 409 }
      );
    }

    if (
      billingUser.stripeSubscriptionId &&
      billingUser.stripeSubscriptionStatus &&
      ACTIVE_SUBSCRIPTION_STATUSES.includes(
        billingUser.stripeSubscriptionStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          subscriptionProcessing: true,
          error:
            "Für dieses Konto besteht bereits ein Abonnement oder ein laufender Zahlungsvorgang.",
        },
        { status: 409 }
      );
    }

    /*
     * Gezählt werden nur tatsächlich aktivierte
     * Founder-Abonnements – keine Registrierungen.
     */
    const claimedFounderCount =
      await prisma.user.count({
        where: {
          founderNumber: {
            not: null,
          },
        },
      });

    if (
      claimedFounderCount >= FOUNDER_LIMIT &&
      !billingUser.founderNumber
    ) {
      return NextResponse.json(
        {
          success: false,
          founderSoldOut: true,
          error:
            "Das Founder-Angebot für die ersten 50 zahlenden Makler ist bereits vergeben.",
        },
        { status: 409 }
      );
    }

    const stripe = getStripe();

    const customerId =
      await getOrCreateCustomer(
        stripe,
        billingUser
      );

    /*
     * Bereits offene Founder-Checkouts desselben
     * Kunden werden wiederverwendet.
     */
    const openSessions =
      await stripe.checkout.sessions.list({
        customer: customerId,
        status: "open",
        limit: 10,
      });

    const matchingOpenSessions =
      openSessions.data.filter(
        (session) =>
          session.mode === "subscription" &&
          session.metadata?.userId ===
            billingUser.id &&
          session.metadata?.plan ===
            "founder"
      );

    const existingCheckout =
      matchingOpenSessions.find(
        (session) =>
          session.metadata?.trialPeriodDays ===
            String(FOUNDER_TRIAL_DAYS) &&
          typeof session.url === "string"
      );

    if (existingCheckout?.url) {
      return NextResponse.json({
        success: true,
        reused: true,
        url: existingCheckout.url,
      });
    }

    /*
     * Offene Checkout-Sitzungen aus der Zeit vor
     * dem 30-Tage-Test dürfen nicht wiederverwendet
     * werden, weil sie sofort kostenpflichtig wären.
     */
    const staleOpenSessions =
      matchingOpenSessions.filter(
        (session) =>
          session.metadata?.trialPeriodDays !==
          String(FOUNDER_TRIAL_DAYS)
      );

    await Promise.all(
      staleOpenSessions.map((session) =>
        stripe.checkout.sessions
          .expire(session.id)
          .catch((error) => {
            console.warn(
              "ALTER FOUNDER-CHECKOUT KONNTE NICHT ABGELAUFEN WERDEN:",
              session.id,
              error
            );
          })
      )
    );

    /*
     * Verhindert ein zweites Abonnement, falls Stripe
     * bereits eines kennt, der Webhook aber noch läuft.
     */
    const customerSubscriptions =
      await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 20,
      });

    const existingSubscription =
      customerSubscriptions.data.find(
        (subscription) =>
          subscription.metadata?.userId ===
            billingUser.id &&
          subscription.metadata?.plan ===
            "founder" &&
          ![
            "canceled",
            "incomplete_expired",
          ].includes(subscription.status)
      );

    if (existingSubscription) {
      return NextResponse.json(
        {
          success: false,
          subscriptionProcessing: true,
          error:
            "Stripe verarbeitet für dieses Konto bereits ein Founder-Abonnement.",
        },
        { status: 409 }
      );
    }

    const amountCents =
      OFFER_PRICES_CENTS.founder;

    const appUrl = getAppUrl(request.url);

    const localeCookie =
      request.cookies
        .get(LOCALE_COOKIE_NAME)
        ?.value
        .trim()
        .toLowerCase() ?? "";

    const checkoutLocale =
      localeCookie === "de" ||
      localeCookie === "it" ||
      localeCookie === "fr" ||
      localeCookie === "en"
        ? localeCookie
        : "auto";

    const productDescription =
      checkoutLocale === "auto"
        ? FOUNDER_PRODUCT_DESCRIPTIONS.de
        : FOUNDER_PRODUCT_DESCRIPTIONS[
            checkoutLocale
          ];

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        client_reference_id:
          billingUser.id,

        branding_settings: {
          display_name: "Inserat-AI",
        },

        adaptive_pricing: {
          enabled: false,
        },

        allow_promotion_codes: false,
        payment_method_collection: "always",

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "chf",
              unit_amount: amountCents,
              recurring: {
                interval: "month",
              },
              product_data: {
                name:
                  "Inserat-AI Founder",
                description:
                  productDescription,
              },
            },
          },
        ],

        metadata: {
          userId: billingUser.id,
          plan: "founder",
          paymentModel: "subscription",
          expectedAmountCents:
            String(amountCents),
          expectedCurrency: "chf",
          trialPeriodDays:
            String(FOUNDER_TRIAL_DAYS),
        },

        subscription_data: {
          trial_period_days:
            FOUNDER_TRIAL_DAYS,

          trial_settings: {
            end_behavior: {
              missing_payment_method:
                "cancel",
            },
          },

          metadata: {
            userId: billingUser.id,
            plan: "founder",
            paymentModel:
              "subscription",
            expectedAmountCents:
              String(amountCents),
            expectedCurrency: "chf",
            trialPeriodDays:
              String(FOUNDER_TRIAL_DAYS),
          },
        },

        success_url:
          `${appUrl}/konto` +
          "?subscription=success" +
          "&session_id={CHECKOUT_SESSION_ID}",

        cancel_url:
          `${appUrl}/` +
          "?subscription=cancelled" +
          "#preise",

        locale: checkoutLocale,
      });

    if (!checkoutSession.url) {
      throw new Error(
        "Stripe hat keine Checkout-Adresse zurückgegeben."
      );
    }

    return NextResponse.json({
      success: true,
      reused: false,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "SUBSCRIPTION CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Der Founder-Checkout konnte momentan nicht gestartet werden.",
      },
      { status: 500 }
    );
  }
}
