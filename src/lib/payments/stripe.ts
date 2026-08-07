import type { PaymentProvider, PaymentSessionInput, PaymentSessionResult } from "./types";

// Real Stripe test-mode Checkout Sessions — genuinely the standout real
// integration for this project: unlike QuickBooks/Xero/NetSuite/Chargebee
// (all need a registered, reviewed OAuth app), a Stripe test secret key
// needs zero business verification. Uses price_data (ad-hoc, one-off
// pricing) rather than a pre-created Price object, since every invoice has
// its own arbitrary amount — Payment Links don't support that, Checkout
// Sessions do.
const BASE_URL = "https://api.stripe.com/v1/checkout/sessions";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

// Stripe's API is application/x-www-form-urlencoded with bracket-notation
// nested keys (line_items[0][price_data][unit_amount]=...), not JSON.
function toFormBody(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

interface StripeSessionResponse {
  id: string;
  url: string;
}

export function createStripePaymentProvider(secretKey: string): PaymentProvider {
  return {
    name: "stripe",
    async createSession(input: PaymentSessionInput): Promise<PaymentSessionResult> {
      const params: Record<string, string> = {
        mode: "payment",
        "line_items[0][quantity]": "1",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(input.amountCents),
        "line_items[0][price_data][product_data][name]": `Invoice ${input.invoiceNumber}`,
        "line_items[0][price_data][product_data][description]": input.description,
        customer_email: input.customerEmail,
        success_url: `${APP_BASE_URL}/pay/${input.invoiceId}?status=success`,
        cancel_url: `${APP_BASE_URL}/pay/${input.invoiceId}?status=cancelled`,
      };

      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: toFormBody(params),
      });

      if (!res.ok) throw new Error(`Stripe checkout session creation failed: ${res.status} ${await res.text()}`);
      const data = (await res.json()) as StripeSessionResponse;
      return { provider: "stripe", externalId: data.id, url: data.url };
    },
  };
}
