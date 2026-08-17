import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { computeDunningSchedule } from "../src/lib/reminders/schedule";

const db = new PrismaClient({
  adapter: new PrismaLibSql({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
    authToken: process.env.DATABASE_AUTH_TOKEN,
  }),
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

// Brackenridge Wholesale Supply (fictional B2B industrial/hardware
// distributor) sells to these customers on NET-30 terms. Prairie Hardware
// Co. is the scripted wrong-quantity dispute demo customer; the other two
// give the aging dashboard and cash forecast real variety (current,
// severely overdue) and Thornbury gives the anomaly detector a real
// history to compare its oversized invoice against.
async function main() {
  const prairie = await getOrCreateCustomer({
    companyName: "Prairie Hardware Co.",
    contactName: "Denise Okoro",
    contactEmail: "denise.okoro@prairiehardware.example",
  });
  await getOrCreateInvoice(prairie.id, {
    invoiceNumber: "INV-1001",
    description: "Fastener restock — 200 units",
    amountCents: 480000,
    issueDate: daysAgo(70),
    dueDate: daysAgo(40),
    status: "paid",
    paidAt: daysAgo(38), // paid 2 days late — a clean-ish history
  });
  await getOrCreateInvoice(prairie.id, {
    invoiceNumber: "INV-1042",
    description: "Bulk fasteners order — 500 units",
    amountCents: 1250000,
    issueDate: daysAgo(35),
    dueDate: daysAgo(5),
    status: "open",
  });

  const fielding = await getOrCreateCustomer({
    companyName: "Fielding & Cross Logistics",
    contactName: "Marcus Fielding",
    contactEmail: "marcus.fielding@fieldingcross.example",
  });
  await getOrCreateInvoice(fielding.id, {
    invoiceNumber: "INV-2000",
    description: "Pallet wrap & strapping supplies",
    amountCents: 315000,
    issueDate: daysAgo(60),
    dueDate: daysAgo(30),
    status: "paid",
    paidAt: daysAgo(30), // paid exactly on time
  });
  await getOrCreateInvoice(fielding.id, {
    invoiceNumber: "INV-2001",
    description: "Warehouse shelving hardware",
    amountCents: 420000,
    issueDate: daysAgo(10),
    dueDate: daysAgo(-20),
    status: "open",
  });

  const thornbury = await getOrCreateCustomer({
    companyName: "Thornbury Staffing Group",
    contactName: "Priya Ramanathan",
    contactEmail: "priya.ramanathan@thornburystaffing.example",
  });
  await getOrCreateInvoice(thornbury.id, {
    invoiceNumber: "INV-3000",
    description: "Uniform & PPE supply order",
    amountCents: 600000,
    issueDate: daysAgo(140),
    dueDate: daysAgo(105),
    status: "paid",
    paidAt: daysAgo(90), // paid 15 days late — establishes a real "pays late" history
  });
  await getOrCreateInvoice(thornbury.id, {
    invoiceNumber: "INV-3001",
    description: "Facility equipment restock — full warehouse order",
    amountCents: 2875000, // ~4.8x their historical average — a real anomaly to flag
    issueDate: daysAgo(95),
    dueDate: daysAgo(65),
    status: "open",
  });
}

async function getOrCreateCustomer(data: { companyName: string; contactName: string; contactEmail: string }) {
  const existing = await db.customer.findFirst({ where: { companyName: data.companyName } });
  if (existing) {
    console.log(`skipping ${data.companyName} — already seeded`);
    return existing;
  }
  const created = await db.customer.create({ data });
  console.log(`seeded customer ${created.companyName}`);
  return created;
}

async function getOrCreateInvoice(
  customerId: string,
  data: { invoiceNumber: string; description: string; amountCents: number; issueDate: Date; dueDate: Date; status: string; paidAt?: Date }
) {
  const existing = await db.invoice.findFirst({ where: { invoiceNumber: data.invoiceNumber } });
  if (existing) {
    console.log(`  skipping ${data.invoiceNumber} — already seeded`);
    return existing;
  }

  const created = await db.invoice.create({ data: { customerId, ...data } });

  // Open invoices get their full deterministic reminder schedule generated
  // immediately, same as a real invoice would the moment it's created —
  // already-settled historical invoices don't need one. Mirrors
  // src/lib/invoices.ts's createInvoiceWithSchedule (not imported here to
  // avoid pulling in @/lib/db's separate PrismaClient instance).
  if (data.status === "open") {
    for (const step of computeDunningSchedule(data.dueDate)) {
      await db.reminderStep.create({ data: { invoiceId: created.id, stage: step.stage, scheduledFor: step.scheduledFor } });
    }
    console.log(`  seeded invoice ${created.invoiceNumber} (open, $${(data.amountCents / 100).toFixed(2)}) + reminder schedule`);
    return created;
  }

  console.log(`  seeded invoice ${created.invoiceNumber} (${data.status}, $${(data.amountCents / 100).toFixed(2)})`);
  return created;
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
