"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getReplyClassificationProvider } from "@/lib/replies";
import { recomputeCustomerRisk } from "@/lib/risk/recompute";
import { getPaymentProvider } from "@/lib/payments";

// No real email-sending integration exists anywhere in this portfolio yet
// (same honest limitation as follow-ups in the other ARC projects) —
// approving always logs what would be sent rather than actually sending
// it. The subject/body reflect whatever the manager left in the form, so
// an edit before approving is captured too.
export async function approveAndSendReminderAction(reminderId: string, formData: FormData): Promise<void> {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject || !body) throw new Error("Subject and body are required.");

  const step = await db.reminderStep.update({
    where: { id: reminderId },
    data: { subject, body, status: "sent_log_only", sentAt: new Date() },
    include: { invoice: { include: { customer: true } } },
  });

  console.log(`[REMINDER log-only — no email provider configured] to ${step.invoice.customer.contactEmail}:\nSubject: ${subject}\n${body}`);

  revalidatePath(`/invoices/${step.invoiceId}`);
  revalidatePath(`/invoices/${step.invoiceId}/reminders/${reminderId}`);
  revalidatePath("/");
}

// No real inbound-email integration exists (same honest gap as the reply
// simulator in signal-outbound-engine) — this is the demo/testing path for
// exercising real classification against a real (if hand-typed) message.
export async function processReply(invoiceId: string, rawText: string): Promise<void> {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

  const provider = getReplyClassificationProvider();
  const result = await provider.classify({
    invoiceNumber: invoice.invoiceNumber,
    description: invoice.description,
    amountCents: invoice.amountCents,
    dueDateISO: invoice.dueDate.toISOString().slice(0, 10),
    rawText,
  });

  const reply = await db.customerReply.create({ data: { invoiceId, rawText, classification: result.classification } });

  if (result.classification === "dispute") {
    // The core "distinguish disputes from delays" behavior the brief names:
    // a dispute means the invoice may not even be correct as billed, so
    // continuing to send payment reminders would be actively wrong until a
    // human has reviewed it.
    await db.dispute.create({
      data: { invoiceId, replyId: reply.id, description: result.disputeDescription ?? "Customer disputed this invoice." },
    });
    await db.invoice.update({ where: { id: invoiceId }, data: { status: "disputed" } });
    await db.reminderStep.updateMany({ where: { invoiceId, status: { in: ["pending", "drafted"] } }, data: { status: "paused" } });
  } else if (result.classification === "promise_to_pay" && result.promisedDateISO) {
    const promisedDate = new Date(result.promisedDateISO);
    if (!Number.isNaN(promisedDate.getTime())) {
      await db.promiseToPay.create({
        data: { invoiceId, replyId: reply.id, promisedDate, promisedAmountCents: result.promisedAmountCents },
      });
    }
  }
  // "question" / "already_paid" / "other" are logged on the communication
  // history above with no further side effect.

  await recomputeCustomerRisk(invoice.customerId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/disputes");
  revalidatePath("/");
}

export async function simulateReplyAction(invoiceId: string, formData: FormData): Promise<void> {
  const rawText = String(formData.get("replyText") ?? "").trim();
  if (!rawText) throw new Error("Reply text is required.");
  await processReply(invoiceId, rawText);
}

// Resuming un-pauses every paused ReminderStep back to "pending" — the next
// `run-reminders` pass picks them up (their scheduledFor dates are likely
// already in the past by the time a dispute gets resolved, so they'll be
// drafted immediately on the next run, same as a genuinely overdue step).
export async function resolveDisputeAction(disputeId: string, formData: FormData): Promise<void> {
  const resolutionNote = String(formData.get("resolutionNote") ?? "").trim();
  if (!resolutionNote) throw new Error("A resolution note is required.");

  const dispute = await db.dispute.update({
    where: { id: disputeId },
    data: { status: "resolved", resolutionNote, resolvedAt: new Date() },
    include: { invoice: true },
  });

  await db.invoice.update({ where: { id: dispute.invoiceId }, data: { status: "open" } });
  await db.reminderStep.updateMany({ where: { invoiceId: dispute.invoiceId, status: "paused" }, data: { status: "pending" } });

  await recomputeCustomerRisk(dispute.invoice.customerId);

  revalidatePath(`/invoices/${dispute.invoiceId}`);
  revalidatePath("/disputes");
  revalidatePath("/");
}

// No real Stripe webhook handling exists in this prototype (that needs a
// public endpoint + registered webhook secret, out of scope here) — same
// manual-fallback pattern as booking confirmation in the other ARC
// projects. Marking paid also settles any pending promise-to-pay as kept,
// since the debt it was made against no longer exists.
export async function markInvoicePaidAction(invoiceId: string): Promise<void> {
  const invoice = await db.invoice.update({ where: { id: invoiceId }, data: { status: "paid", paidAt: new Date() } });

  await db.promiseToPay.updateMany({ where: { invoiceId, status: "pending" }, data: { status: "kept" } });

  await recomputeCustomerRisk(invoice.customerId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/cash-forecast");
  revalidatePath("/");
}

// Creates a fresh checkout session each time it's called rather than
// caching one — cheap and harmless at prototype scale, and guarantees the
// link is never stale (Stripe Checkout Sessions expire after 24h).
export async function createPaymentSessionAction(invoiceId: string): Promise<void> {
  const invoice = await db.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { customer: true } });

  const provider = getPaymentProvider();
  const result = await provider.createSession({
    invoiceId,
    invoiceNumber: invoice.invoiceNumber,
    description: invoice.description,
    amountCents: invoice.amountCents,
    customerEmail: invoice.customer.contactEmail,
  });

  await db.paymentSession.create({
    data: { invoiceId, provider: result.provider, externalId: result.externalId, url: result.url },
  });

  revalidatePath(`/pay/${invoiceId}`);
}
