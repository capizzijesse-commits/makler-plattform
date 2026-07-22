import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const secretKey =
    process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY fehlt in den Umgebungsvariablen."
    );
  }

  if (!secretKey.startsWith("sk_test_") &&
      !secretKey.startsWith("sk_live_")) {
    throw new Error(
      "STRIPE_SECRET_KEY besitzt kein gültiges Format."
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}