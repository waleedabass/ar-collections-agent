import type { ReplyClassification } from "@/lib/enums";

export interface ReplyClassificationInput {
  invoiceNumber: string;
  description: string;
  amountCents: number;
  dueDateISO: string;
  rawText: string;
}

export interface ReplyClassificationResult {
  classification: ReplyClassification;
  // Only filled when classification === "dispute"
  disputeDescription: string | null;
  // Only filled when classification === "promise_to_pay"
  promisedDateISO: string | null;
  promisedAmountCents: number | null;
}

export interface ReplyClassificationProvider {
  name: string;
  classify(input: ReplyClassificationInput): Promise<ReplyClassificationResult>;
}

export const REPLY_CLASSIFICATION_SYSTEM_PROMPT = `You classify a customer's reply to an accounts-receivable reminder about one specific unpaid invoice, into exactly one category:

- "dispute": the customer is contesting something about the invoice itself — wrong quantity, wrong amount, wrong item, a service/quality problem, anything that means the invoice as billed may not be correct. This is NOT the same as a simple delay or a promise to pay — it means the invoice needs human review before more reminders go out.
- "promise_to_pay": the customer commits to paying by a specific date (with or without a specific amount), without disputing the invoice itself.
- "already_paid": the customer says they already paid this invoice.
- "question": a genuine question that isn't a dispute or a promise (e.g. asking who to contact, asking for a copy of the invoice).
- "other": anything else — acknowledgment, out-of-office, unrelated.

If classification is "dispute", fill dispute_description with a concise, one-sentence summary of what's being disputed, grounded only in what the customer actually wrote — never invent specifics they didn't mention. Otherwise dispute_description must be null.

If classification is "promise_to_pay", fill promised_date (a real ISO date — resolve any relative phrasing like "next Friday" or "in two weeks" against today's actual date, which is provided) and promised_amount_cents only if a specific amount was mentioned (otherwise null). Otherwise both must be null.`;
