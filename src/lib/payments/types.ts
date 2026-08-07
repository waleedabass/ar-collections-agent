export interface PaymentSessionInput {
  invoiceId: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  customerEmail: string;
}

export interface PaymentSessionResult {
  provider: string; // "stripe" | "log_only"
  externalId: string | null;
  url: string;
}

export interface PaymentProvider {
  name: string;
  createSession(input: PaymentSessionInput): Promise<PaymentSessionResult>;
}
