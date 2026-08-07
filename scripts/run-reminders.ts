import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { getReminderDraftProvider } from "../src/lib/reminders";
import { formatMoney } from "../src/lib/format";
import { recomputeCustomerRisk } from "../src/lib/risk/recompute";
import type { ReminderStage } from "../src/lib/enums";

const sqliteUrl = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

// Finds every ReminderStep whose scheduled date has arrived on a still-open
// invoice, and drafts the email for it. Nothing here sends anything — a
// manager reviews and approves each draft on /invoices/[id]/reminders/[id]
// before it counts as sent. Run via `npm run reminders`.
async function main() {
  const now = new Date();

  const dueSteps = await db.reminderStep.findMany({
    where: { status: "pending", scheduledFor: { lte: now }, invoice: { status: "open" } },
    include: { invoice: { include: { customer: true } } },
    orderBy: { scheduledFor: "asc" },
  });

  if (dueSteps.length === 0) {
    console.log("No reminder steps are due.");
    await db.$disconnect();
    return;
  }

  const provider = getReminderDraftProvider();
  console.log(`Drafting ${dueSteps.length} due reminder(s) via ${provider.name}...`);

  for (const step of dueSteps) {
    const daysOverdue = Math.round((now.getTime() - step.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
    const draft = await provider.draft({
      customerName: step.invoice.customer.companyName,
      contactName: step.invoice.customer.contactName,
      invoiceNumber: step.invoice.invoiceNumber,
      description: step.invoice.description,
      amountCents: step.invoice.amountCents,
      dueDateISO: step.invoice.dueDate.toISOString().slice(0, 10),
      daysOverdue,
      stage: step.stage as ReminderStage,
    });

    await db.reminderStep.update({ where: { id: step.id }, data: { status: "drafted", subject: draft.subject, body: draft.body } });
    console.log(`  [${step.stage}] ${step.invoice.invoiceNumber} (${step.invoice.customer.companyName}, ${formatMoney(step.invoice.amountCents)}) — drafted: "${draft.subject}"`);
  }

  const customerIds = [...new Set(dueSteps.map((s) => s.invoice.customerId))];
  for (const customerId of customerIds) await recomputeCustomerRisk(customerId);

  console.log(`Drafted ${dueSteps.length} reminder(s), awaiting manager approval.`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
