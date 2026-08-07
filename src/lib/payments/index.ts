import type { PaymentProvider } from "./types";
import { createStripePaymentProvider } from "./stripe";
import { logOnlyPaymentProvider } from "./logOnly";

export function getPaymentProvider(): PaymentProvider {
  if (process.env.STRIPE_SECRET_KEY) return createStripePaymentProvider(process.env.STRIPE_SECRET_KEY);
  return logOnlyPaymentProvider;
}

export type { PaymentProvider, PaymentSessionInput, PaymentSessionResult } from "./types";
