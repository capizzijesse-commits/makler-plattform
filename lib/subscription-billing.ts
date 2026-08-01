import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";

import { OFFER_PRICES_CENTS } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";


const FOUNDER_LIMIT = 50;
const SUBSCRIPTION_TRIAL_DAYS = 30;
const SECONDS_PER_DAY = 24 * 60 * 60;
const TRIAL_WINDOW_TOLERANCE_SECONDS = 5 * 60;

const SUBSCRIPTION_ACCESS_STATUSES = [
  "active",
  "trialing",
  "past_due",
] as const;

type SubscriptionPlan =
  | "founder"
  | "standard";

type SubscriptionMetadata = {
  userId: string;
  plan: SubscriptionPlan;
  expectedAmountCents: number;
};

function getReferenceId(
  value: unknown
): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "id" in value
  ) {
    const id = (value as { id?: unknown }).id;

    return typeof id === "string"
      ? id.trim()
      : "";
  }

  return "";
}


function readSubscriptionPlan(
  value: unknown
): SubscriptionPlan {
  const plan =
    typeof value === "string"
      ? value.trim().toLowerCase()
      : "";

  if (
    plan !== "founder" &&
    plan !== "standard"
  ) {
    throw new Error(
      "Der Stripe-Abo-Plan ist ungültig."
    );
  }

  return plan;
}

function getExpectedPlanAmount(
  plan: SubscriptionPlan
): number {
  return plan === "founder"
    ? OFFER_PRICES_CENTS.founder
    : OFFER_PRICES_CENTS.standard;
}

function readExpectedAmount(
  plan: SubscriptionPlan,
  value: unknown
): number {
  const amount = Number(value);
  const expectedAmount =
    getExpectedPlanAmount(plan);

  if (
    !Number.isInteger(amount) ||
    amount !== expectedAmount
  ) {
    throw new Error(
      "Der erwartete Abo-Betrag ist ungültig."
    );
  }

  return amount;
}

function readCheckoutMetadata(
  session: Stripe.Checkout.Session
): SubscriptionMetadata {
  const userId =
    session.metadata?.userId?.trim() ?? "";

  const plan =
    readSubscriptionPlan(
      session.metadata?.plan
    );

  const paymentModel =
    session.metadata?.paymentModel?.trim() ?? "";

  const currency =
    session.metadata?.expectedCurrency
      ?.trim()
      .toLowerCase() ?? "";

  if (
    !userId ||
    userId.length > 128
  ) {
    throw new Error(
      "Die Stripe-Benutzer-ID ist ungültig."
    );
  }

  if (paymentModel !== "subscription") {
    throw new Error(
      "Das Stripe-Zahlungsmodell ist ungültig."
    );
  }

  if (currency !== "chf") {
    throw new Error(
      "Die Stripe-Abo-Währung ist ungültig."
    );
  }

  return {
    userId,
    plan,
    expectedAmountCents:
      readExpectedAmount(
        plan,
        session.metadata?.expectedAmountCents
      ),
  };
}

function readSubscriptionMetadata(
  subscription: Stripe.Subscription
): SubscriptionMetadata {
  const userId =
    subscription.metadata?.userId?.trim() ??
    "";

  const plan =
    readSubscriptionPlan(
      subscription.metadata?.plan
    );

  const paymentModel =
    subscription.metadata?.paymentModel
      ?.trim() ?? "";

  const currency =
    subscription.metadata?.expectedCurrency
      ?.trim()
      .toLowerCase() ?? "";

  if (
    !userId ||
    userId.length > 128
  ) {
    throw new Error(
      "Die Abo-Benutzer-ID ist ungültig."
    );
  }

  if (paymentModel !== "subscription") {
    throw new Error(
      "Das Abo-Zahlungsmodell ist ungültig."
    );
  }

  if (currency !== "chf") {
    throw new Error(
      "Die Abo-Währung ist ungültig."
    );
  }

  return {
    userId,
    plan,
    expectedAmountCents:
      readExpectedAmount(
        plan,
        subscription.metadata
          ?.expectedAmountCents
      ),
  };
}

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): Date | null {
  const subscriptionValue =
    subscription as unknown as {
      current_period_end?: unknown;
      items?: {
        data?: Array<{
          current_period_end?: unknown;
        }>;
      };
    };

  const directValue =
    subscriptionValue.current_period_end;

  const itemValue =
    subscriptionValue.items?.data?.[0]
      ?.current_period_end;

  const timestamp =
    typeof directValue === "number"
      ? directValue
      : typeof itemValue === "number"
        ? itemValue
        : null;

  return timestamp
    ? new Date(timestamp * 1000)
    : null;
}

function getPrimaryPrice(
  subscription: Stripe.Subscription
): Stripe.Price {
  const price =
    subscription.items.data[0]?.price;

  if (!price) {
    throw new Error(
      "Das Founder-Abonnement besitzt keinen Preis."
    );
  }

  return price;
}


function validateSubscription(
  expectedLiveMode: boolean,
  subscription: Stripe.Subscription,
  metadata: SubscriptionMetadata,
  expectedCustomerId: string,
  expectedSubscriptionId: string
): void {
  if (
    subscription.livemode !==
    expectedLiveMode
  ) {
    throw new Error(
      "Stripe-Abo und Event verwenden unterschiedliche Modi."
    );
  }

  if (
    subscription.id !==
    expectedSubscriptionId
  ) {
    throw new Error(
      "Die Stripe-Abonnement-ID stimmt nicht überein."
    );
  }

  const customerId =
    getReferenceId(subscription.customer);

  if (
    !customerId ||
    customerId !== expectedCustomerId
  ) {
    throw new Error(
      "Der Stripe-Kunde stimmt nicht überein."
    );
  }

  const subscriptionMetadata =
    readSubscriptionMetadata(
      subscription
    );

  if (
    subscriptionMetadata.userId !==
      metadata.userId ||
    subscriptionMetadata.plan !==
      metadata.plan ||
    subscriptionMetadata
      .expectedAmountCents !==
      metadata.expectedAmountCents
  ) {
    throw new Error(
      "Checkout und Abonnement stimmen nicht überein."
    );
  }

  const price =
    getPrimaryPrice(subscription);

  if (
    price.currency.toLowerCase() !==
      "chf" ||
    price.unit_amount !==
      metadata.expectedAmountCents ||
    price.unit_amount !==
      getExpectedPlanAmount(metadata.plan) ||
    price.recurring?.interval !==
      "month"
  ) {
    throw new Error(
      "Der Stripe-Abo-Preis ist ungültig."
    );
  }
}

function validateSubscriptionCheckoutCompletion(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
  expectedAmountCents: number
): void {
  if (
    session.currency?.toLowerCase() !==
    "chf"
  ) {
    throw new Error(
      "Die Stripe-Abo-Währung ist ungültig."
    );
  }

  const paidCheckoutIsValid =
    session.payment_status === "paid" &&
    session.amount_total ===
      expectedAmountCents &&
    subscription.status === "active";

  const sessionTrialDays = Number(
    session.metadata?.trialPeriodDays
  );

  const subscriptionTrialDays = Number(
    subscription.metadata?.trialPeriodDays
  );

  const trialStart =
    subscription.trial_start;

  const trialEnd =
    subscription.trial_end;

  const expectedTrialSeconds =
    SUBSCRIPTION_TRIAL_DAYS *
    SECONDS_PER_DAY;

  const actualTrialSeconds =
    typeof trialStart === "number" &&
    typeof trialEnd === "number"
      ? trialEnd - trialStart
      : null;

  const trialWindowIsValid =
    actualTrialSeconds !== null &&
    Math.abs(
      actualTrialSeconds -
        expectedTrialSeconds
    ) <=
      TRIAL_WINDOW_TOLERANCE_SECONDS;

  const trialPaymentStatusIsValid =
    session.payment_status === "paid" ||
    session.payment_status ===
      "no_payment_required";

  const trialCheckoutIsValid =
    trialPaymentStatusIsValid &&
    session.amount_total === 0 &&
    subscription.status === "trialing" &&
    sessionTrialDays ===
      SUBSCRIPTION_TRIAL_DAYS &&
    subscriptionTrialDays ===
      SUBSCRIPTION_TRIAL_DAYS &&
    trialWindowIsValid;

  if (
    !paidCheckoutIsValid &&
    !trialCheckoutIsValid
  ) {
    throw new Error(
      "Der Abo-Checkout besitzt keinen gültigen Zahlungs- oder Teststatus."
    );
  }
}

async function createEventRecord(
  transaction: Prisma.TransactionClient,
  event: Stripe.Event,
  stripeSessionId: string | null,
  outcome: string
): Promise<void> {
  await transaction
    .stripeWebhookEvent
    .create({
      data: {
        eventId: event.id,
        eventType: event.type,
        stripeSessionId,
        outcome,
        livemode: event.livemode,
        stripeCreatedAt: new Date(
          event.created * 1000
        ),
      },
    });
}

async function getNextFounderNumber(
  transaction: Prisma.TransactionClient,
  userId: string
): Promise<number> {
  const existingUser =
    await transaction.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        founderNumber: true,
      },
    });

  if (existingUser?.founderNumber) {
    return existingUser.founderNumber;
  }

  const claimedFounderCount =
    await transaction.user.count({
      where: {
        founderNumber: {
          not: null,
        },
      },
    });

  if (
    claimedFounderCount >=
    FOUNDER_LIMIT
  ) {
    throw new Error(
      "Alle 50 Founder-Plätze sind bereits vergeben."
    );
  }

  const highestFounder =
    await transaction.user.aggregate({
      _max: {
        founderNumber: true,
      },
    });

  return (
    highestFounder._max.founderNumber ?? 0
  ) + 1;
}

export function getSubscriptionEventObject(
  event: Stripe.Event
): Stripe.Subscription {
  const object = event.data.object;

  if (
    !object ||
    object.object !== "subscription"
  ) {
    throw new Error(
      "Das Stripe-Event enthält kein Abonnement."
    );
  }

  return object as Stripe.Subscription;
}


export async function processSuccessfulSubscriptionCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata =
    readCheckoutMetadata(session);

  if (
    session.mode !== "subscription" ||
    session.status !== "complete"
  ) {
    throw new Error(
      "Der Abo-Checkout wurde nicht vollständig abgeschlossen."
    );
  }

  if (
    session.client_reference_id !==
    metadata.userId
  ) {
    throw new Error(
      "Stripe-Referenz und Benutzer-ID stimmen nicht überein."
    );
  }

  const customerId =
    getReferenceId(session.customer);

  const subscriptionId =
    getReferenceId(session.subscription);

  if (
    !customerId ||
    !subscriptionId
  ) {
    throw new Error(
      "Stripe-Kunde oder Abonnement fehlt."
    );
  }

  const stripe = getStripe();

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  validateSubscription(
    event.livemode,
    subscription,
    metadata,
    customerId,
    subscriptionId
  );

  validateSubscriptionCheckoutCompletion(
    session,
    subscription,
    metadata.expectedAmountCents
  );

  const price =
    getPrimaryPrice(subscription);

  await prisma.$transaction(
    async (transaction) => {
      await createEventRecord(
        transaction,
        event,
        session.id,
        "processing_subscription"
      );

      const user =
        await transaction.user.findUnique({
          where: {
            id: metadata.userId,
          },
          select: {
            id: true,
            role: true,
            plan: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            stripeSubscriptionStatus: true,
            founderNumber: true,
          },
        });

      if (!user) {
        throw new Error(
          "Das Benutzerkonto wurde nicht gefunden."
        );
      }

      if (
        user.stripeCustomerId &&
        user.stripeCustomerId !==
          customerId
      ) {
        throw new Error(
          "Der Stripe-Kunde gehört nicht zu diesem Konto."
        );
      }

      if (
        user.stripeSubscriptionId &&
        user.stripeSubscriptionId !==
          subscriptionId &&
        ![
          "canceled",
          "incomplete_expired",
        ].includes(
          user.stripeSubscriptionStatus ?? ""
        )
      ) {
        throw new Error(
          "Das Konto besitzt bereits ein anderes aktives Abonnement."
        );
      }

      let founderNumber =
        user.founderNumber;

      if (
        metadata.plan === "founder" &&
        !founderNumber
      ) {
        founderNumber =
          await getNextFounderNumber(
            transaction,
            user.id
          );
      }

      if (
        metadata.plan === "founder" &&
        !founderNumber
      ) {
        throw new Error(
          "Die Founder-Nummer konnte nicht vergeben werden."
        );
      }

      const preserveAdmin =
        user.role === "admin" ||
        user.plan === "admin";

      await transaction.user.update({
        where: {
          id: user.id,
        },
        data: {
          plan: preserveAdmin
            ? "admin"
            : metadata.plan,

          isFounder:
            Boolean(founderNumber),

          founderNumber,

          founderPriceCents:
            metadata.plan === "founder"
              ? OFFER_PRICES_CENTS.founder
              : null,

          stripeCustomerId: customerId,
          stripeSubscriptionId:
            subscriptionId,
          stripeSubscriptionStatus:
            subscription.status,
          stripeSubscriptionPriceId:
            price.id,
          stripeCurrentPeriodEnd:
            getSubscriptionPeriodEnd(
              subscription
            ),
          stripeCancelAtPeriodEnd:
            subscription.cancel_at_period_end,
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
              `${metadata.plan}_active`,
          },
        });
    }
  );
}

function getExpectedStripeLiveMode(): boolean {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim() ?? "";

  if (secretKey.startsWith("sk_live_")) {
    return true;
  }

  if (secretKey.startsWith("sk_test_")) {
    return false;
  }

  throw new Error(
    "Der Stripe-Modus konnte nicht bestimmt werden."
  );
}

function getPrismaErrorCode(
  error: unknown
): string | null {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return null;
  }

  const code =
    (error as { code?: unknown }).code;

  return typeof code === "string"
    ? code
    : null;
}


export async function verifyAndActivateSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  authenticatedUserId: string
): Promise<{
  plan:
    | "founder"
    | "standard"
    | "admin";
  founderNumber: number | null;
  subscriptionStatus: string;
}> {
  const metadata =
    readCheckoutMetadata(session);

  if (
    !authenticatedUserId ||
    authenticatedUserId.length > 128 ||
    metadata.userId !== authenticatedUserId
  ) {
    throw new Error(
      "Die Checkout-Sitzung gehört nicht zu diesem Benutzerkonto."
    );
  }

  const expectedLiveMode =
    getExpectedStripeLiveMode();

  if (
    session.livemode !== expectedLiveMode
  ) {
    throw new Error(
      "Stripe-Testmodus und Anwendung stimmen nicht überein."
    );
  }

  if (
    session.mode !== "subscription" ||
    session.status !== "complete"
  ) {
    throw new Error(
      "Das Abonnement wurde nicht vollständig abgeschlossen."
    );
  }

  if (
    session.client_reference_id !==
    authenticatedUserId
  ) {
    throw new Error(
      "Die Stripe-Referenz stimmt nicht mit dem Benutzerkonto überein."
    );
  }

  const customerId =
    getReferenceId(session.customer);

  const subscriptionId =
    getReferenceId(session.subscription);

  if (
    !customerId ||
    !subscriptionId
  ) {
    throw new Error(
      "Stripe-Kunde oder Abonnement fehlt."
    );
  }

  const stripe = getStripe();

  const subscription =
    await stripe.subscriptions.retrieve(
      subscriptionId
    );

  validateSubscription(
    session.livemode,
    subscription,
    metadata,
    customerId,
    subscriptionId
  );

  validateSubscriptionCheckoutCompletion(
    session,
    subscription,
    metadata.expectedAmountCents
  );

  if (
    !SUBSCRIPTION_ACCESS_STATUSES.includes(
      subscription.status as
        (typeof SUBSCRIPTION_ACCESS_STATUSES)[number]
    )
  ) {
    throw new Error(
      "Das Abonnement besitzt keinen aktiven Status."
    );
  }

  const price =
    getPrimaryPrice(subscription);

  for (
    let attempt = 1;
    attempt <= 5;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        async (transaction) => {
          const user =
            await transaction.user.findUnique({
              where: {
                id: authenticatedUserId,
              },
              select: {
                id: true,
                role: true,
                plan: true,
                founderNumber: true,
                stripeCustomerId: true,
                stripeSubscriptionId: true,
                stripeSubscriptionStatus: true,
              },
            });

          if (!user) {
            throw new Error(
              "Das Benutzerkonto wurde nicht gefunden."
            );
          }

          if (
            user.stripeCustomerId &&
            user.stripeCustomerId !==
              customerId
          ) {
            throw new Error(
              "Der Stripe-Kunde gehört nicht zu diesem Konto."
            );
          }

          if (
            user.stripeSubscriptionId &&
            user.stripeSubscriptionId !==
              subscriptionId &&
            ![
              "canceled",
              "incomplete_expired",
            ].includes(
              user.stripeSubscriptionStatus ?? ""
            )
          ) {
            throw new Error(
              "Das Konto besitzt bereits ein anderes aktives Abonnement."
            );
          }

          let founderNumber =
            user.founderNumber;

          if (
            metadata.plan === "founder" &&
            !founderNumber
          ) {
            founderNumber =
              await getNextFounderNumber(
                transaction,
                user.id
              );
          }

          if (
            metadata.plan === "founder" &&
            !founderNumber
          ) {
            throw new Error(
              "Die Founder-Nummer konnte nicht vergeben werden."
            );
          }

          const preserveAdmin =
            user.role === "admin" ||
            user.plan === "admin";

          const updatedUser =
            await transaction.user.update({
              where: {
                id: user.id,
              },
              data: {
                plan: preserveAdmin
                  ? "admin"
                  : metadata.plan,

                isFounder:
                  Boolean(founderNumber),

                founderNumber,

                founderPriceCents:
                  metadata.plan === "founder"
                    ? OFFER_PRICES_CENTS.founder
                    : null,

                stripeCustomerId:
                  customerId,

                stripeSubscriptionId:
                  subscriptionId,

                stripeSubscriptionStatus:
                  subscription.status,

                stripeSubscriptionPriceId:
                  price.id,

                stripeCurrentPeriodEnd:
                  getSubscriptionPeriodEnd(
                    subscription
                  ),

                stripeCancelAtPeriodEnd:
                  subscription
                    .cancel_at_period_end,
              },
              select: {
                plan: true,
                founderNumber: true,
                stripeSubscriptionStatus:
                  true,
              },
            });

          return {
            plan:
              updatedUser.plan === "admin"
                ? "admin"
                : metadata.plan,
            founderNumber:
              updatedUser.founderNumber,
            subscriptionStatus:
              updatedUser
                .stripeSubscriptionStatus ??
              subscription.status,
          };
        },
        {
          isolationLevel:
            "Serializable",
        }
      );
    } catch (error) {
      const code =
        getPrismaErrorCode(error);

      if (
        attempt < 5 &&
        (
          code === "P2002" ||
          code === "P2034"
        )
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Die Abo-Aktivierung konnte nicht abgeschlossen werden."
  );
}

export const verifyAndActivateFounderCheckout =
  verifyAndActivateSubscriptionCheckout;


export async function processFailedSubscriptionCheckout(
  event: Stripe.Event,
  session: Stripe.Checkout.Session
): Promise<void> {
  const metadata =
    readCheckoutMetadata(session);

  if (
    session.mode !== "subscription" ||
    session.client_reference_id !==
      metadata.userId
  ) {
    throw new Error(
      "Der fehlgeschlagene Abo-Checkout ist ungültig."
    );
  }

  await prisma.$transaction(
    async (transaction) => {
      await createEventRecord(
        transaction,
        event,
        session.id,
        "subscription_checkout_failed"
      );
    }
  );
}


export async function processSubscriptionLifecycleEvent(
  event: Stripe.Event,
  subscription: Stripe.Subscription
): Promise<void> {
  const metadata =
    readSubscriptionMetadata(
      subscription
    );

  if (
    subscription.livemode !==
    event.livemode
  ) {
    throw new Error(
      "Abo-Event und Stripe-Abonnement verwenden unterschiedliche Modi."
    );
  }

  const customerId =
    getReferenceId(subscription.customer);

  if (!customerId) {
    throw new Error(
      "Der Stripe-Kunde des Abonnements fehlt."
    );
  }

  const price =
    getPrimaryPrice(subscription);

  if (
    price.currency.toLowerCase() !==
      "chf" ||
    price.unit_amount !==
      metadata.expectedAmountCents ||
    price.unit_amount !==
      getExpectedPlanAmount(metadata.plan) ||
    price.recurring?.interval !==
      "month"
  ) {
    throw new Error(
      "Der Abo-Preis ist ungültig."
    );
  }

  const hasSubscriptionAccess =
    SUBSCRIPTION_ACCESS_STATUSES.includes(
      subscription.status as
        (typeof SUBSCRIPTION_ACCESS_STATUSES)[number]
    );

  await prisma.$transaction(
    async (transaction) => {
      await createEventRecord(
        transaction,
        event,
        null,
        "processing_subscription_status"
      );

      const user =
        await transaction.user.findUnique({
          where: {
            id: metadata.userId,
          },
          select: {
            id: true,
            role: true,
            plan: true,
            founderNumber: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
          },
        });

      if (!user) {
        throw new Error(
          "Das Benutzerkonto des Abonnements wurde nicht gefunden."
        );
      }

      if (
        user.stripeCustomerId &&
        user.stripeCustomerId !==
          customerId
      ) {
        throw new Error(
          "Das Stripe-Abonnement gehört zu einem anderen Kunden."
        );
      }

      if (
        user.stripeSubscriptionId &&
        user.stripeSubscriptionId !==
          subscription.id
      ) {
        throw new Error(
          "Das Konto besitzt ein anderes Stripe-Abonnement."
        );
      }

      let founderNumber =
        user.founderNumber;

      if (
        metadata.plan === "founder" &&
        hasSubscriptionAccess &&
        !founderNumber
      ) {
        founderNumber =
          await getNextFounderNumber(
            transaction,
            user.id
          );
      }

      if (
        metadata.plan === "founder" &&
        hasSubscriptionAccess &&
        !founderNumber
      ) {
        throw new Error(
          "Die Founder-Nummer konnte nicht vergeben werden."
        );
      }

      const preserveAdmin =
        user.role === "admin" ||
        user.plan === "admin";

      await transaction.user.update({
        where: {
          id: user.id,
        },
        data: {
          plan: preserveAdmin
            ? "admin"
            : hasSubscriptionAccess
              ? metadata.plan
              : "free",

          isFounder:
            Boolean(founderNumber),

          founderNumber,

          founderPriceCents:
            metadata.plan === "founder" &&
            founderNumber
              ? OFFER_PRICES_CENTS.founder
              : null,

          stripeCustomerId:
            customerId,

          stripeSubscriptionId:
            subscription.id,

          stripeSubscriptionStatus:
            subscription.status,

          stripeSubscriptionPriceId:
            price.id,

          stripeCurrentPeriodEnd:
            getSubscriptionPeriodEnd(
              subscription
            ),

          stripeCancelAtPeriodEnd:
            subscription
              .cancel_at_period_end,
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
              hasSubscriptionAccess
                ? `${metadata.plan}_${subscription.status}`
                : `${metadata.plan}_access_removed_${subscription.status}`,
          },
        });
    }
  );
}
