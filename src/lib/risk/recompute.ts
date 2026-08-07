import { db } from "@/lib/db";
import { computeCustomerRisk } from "./score";
import { getRiskExplainProvider } from "./index";

// Recomputes a customer's risk from their FULL invoice/dispute/promise
// history, run after every reply and every reminder pass — same
// "re-aggregate from scratch" approach as sales-call-intelligence's deal
// risk, so the number always reflects reality rather than drifting from
// incremental patches.
export async function recomputeCustomerRisk(customerId: string): Promise<void> {
  const customer = await db.customer.findUniqueOrThrow({ where: { id: customerId } });
  const invoices = await db.invoice.findMany({ where: { customerId } });
  const invoiceIds = invoices.map((i) => i.id);

  const now = new Date();

  // A pending promise whose date has passed on a still-open invoice is a
  // broken promise — persist that transition before scoring off of it.
  await db.promiseToPay.updateMany({
    where: { invoiceId: { in: invoiceIds }, status: "pending", promisedDate: { lt: now }, invoice: { status: { not: "paid" } } },
    data: { status: "broken" },
  });

  const overdueInvoices = invoices.filter((i) => i.status === "open" && i.dueDate < now);
  const openDisputes = await db.dispute.findMany({ where: { invoiceId: { in: invoiceIds }, status: "open" } });
  const brokenPromiseCount = await db.promiseToPay.count({ where: { invoiceId: { in: invoiceIds }, status: "broken" } });
  const maxDaysOverdue =
    overdueInvoices.length > 0
      ? Math.max(...overdueInvoices.map((i) => Math.floor((now.getTime() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24))))
      : 0;

  const result = computeCustomerRisk({
    overdueInvoiceCount: overdueInvoices.length,
    openDisputeCount: openDisputes.length,
    brokenPromiseCount,
    maxDaysOverdue,
  });

  await db.riskFactor.deleteMany({ where: { customerId } });
  for (const f of result.factors) {
    await db.riskFactor.create({ data: { customerId, label: f.label, points: f.points } });
  }

  let explanation = customer.riskExplanation;
  try {
    const explainProvider = getRiskExplainProvider();
    explanation = await explainProvider.explain({
      customerName: customer.companyName,
      score: result.score,
      label: result.label,
      factors: result.factors,
      openDisputeDescriptions: openDisputes.map((d) => d.description),
    });
  } catch {
    // The score itself is deterministic and already computed above — an AI
    // outage shouldn't block the number just because the narrative call
    // failed. Keeps the previous explanation rather than clearing it.
  }

  await db.customer.update({
    where: { id: customerId },
    data: { riskScore: result.score, riskLabel: result.label, riskExplanation: explanation, riskUpdatedAt: now },
  });
}
