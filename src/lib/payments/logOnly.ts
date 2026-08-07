import type { PaymentProvider, PaymentSessionInput, PaymentSessionResult } from "./types";

export const logOnlyPaymentProvider: PaymentProvider = {
  name: "log_only",
  async createSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
    console.log(`[PAYMENT disabled — set STRIPE_SECRET_KEY] would create a checkout session for invoice ${input.invoiceNumber}, ${input.customerEmail}`);
    return { provider: "log_only", externalId: null, url: "" };
  },
};
