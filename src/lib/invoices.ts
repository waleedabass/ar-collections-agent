import { db } from "@/lib/db";
import { computeDunningSchedule } from "@/lib/reminders/schedule";
import { flagAnomaly } from "@/lib/anomaly";

export interface NewInvoiceInput {
  invoiceNumber: string;
  description: string;
  amountCents: number;
  issueDate: Date;
  dueDate: Date;
}

// Single place that creates an invoice AND its full deterministic reminder
// schedule in one step — used by both the seed script and any future
// "create invoice" action, so the schedule is never accidentally skipped.
// Also runs anomaly detection against the customer's real prior invoices at
// creation time, same "check once, up front" spirit as the schedule.
export async function createInvoiceWithSchedule(customerId: string, data: NewInvoiceInput) {
  const priorInvoices = await db.invoice.findMany({ where: { customerId }, select: { amountCents: true } });
  const anomaly = flagAnomaly(data.amountCents, priorInvoices.map((i) => i.amountCents));

  const invoice = await db.invoice.create({
    data: { customerId, ...data, status: "open", anomalyFlag: anomaly.flag, anomalyReason: anomaly.reason },
  });

  const schedule = computeDunningSchedule(data.dueDate);
  for (const step of schedule) {
    await db.reminderStep.create({ data: { invoiceId: invoice.id, stage: step.stage, scheduledFor: step.scheduledFor } });
  }

  return invoice;
}
