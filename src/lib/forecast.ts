import { db } from "@/lib/db";

export interface ForecastInvoice {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amountCents: number;
  expectedDate: Date;
  basis: "promise" | "history"; // what the expected date is derived from
}

export interface CashForecast {
  totalExpectedCents: number;
  totalAtRiskCents: number; // disputed invoices — no forecast date, genuinely uncertain
  buckets: {
    thisWeek: ForecastInvoice[];
    nextWeek: ForecastInvoice[];
    thisMonth: ForecastInvoice[];
    beyond: ForecastInvoice[];
  };
  atRisk: { invoiceId: string; invoiceNumber: string; customerName: string; amountCents: number }[];
}

const DAY = 24 * 60 * 60 * 1000;

// Deterministic — no AI. Expected collection date is the pending
// promise-to-pay date if one exists (highest confidence — the customer
// told us), else the due date pushed out by that customer's own historical
// average days-late (computed from their real paid invoices), clamped to
// never land before today.
async function averageDaysLate(customerId: string): Promise<number> {
  const paidInvoices = await db.invoice.findMany({ where: { customerId, status: "paid", paidAt: { not: null } } });
  if (paidInvoices.length === 0) return 0;

  const daysLateValues = paidInvoices.map((inv) => {
    const raw = Math.round((inv.paidAt!.getTime() - inv.dueDate.getTime()) / DAY);
    return Math.max(raw, 0); // early payment doesn't make future invoices arrive "early"
  });
  return daysLateValues.reduce((a, b) => a + b, 0) / daysLateValues.length;
}

export async function computeCashForecast(): Promise<CashForecast> {
  const now = new Date();
  const openInvoices = await db.invoice.findMany({
    where: { status: { in: ["open", "disputed"] } },
    include: { customer: true, promisesToPay: { where: { status: "pending" } } },
  });

  const forecastInvoices: ForecastInvoice[] = [];
  const atRisk: CashForecast["atRisk"] = [];
  let totalAtRiskCents = 0;

  for (const invoice of openInvoices) {
    if (invoice.status === "disputed") {
      atRisk.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, customerName: invoice.customer.companyName, amountCents: invoice.amountCents });
      totalAtRiskCents += invoice.amountCents;
      continue;
    }

    const pendingPromise = invoice.promisesToPay[0];
    let expectedDate: Date;
    let basis: ForecastInvoice["basis"];

    if (pendingPromise) {
      expectedDate = pendingPromise.promisedDate;
      basis = "promise";
    } else {
      const avgLate = await averageDaysLate(invoice.customerId);
      expectedDate = new Date(invoice.dueDate.getTime() + avgLate * DAY);
      basis = "history";
    }
    if (expectedDate < now) expectedDate = now;

    forecastInvoices.push({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.companyName,
      amountCents: invoice.amountCents,
      expectedDate,
      basis,
    });
  }

  const oneWeek = new Date(now.getTime() + 7 * DAY);
  const twoWeeks = new Date(now.getTime() + 14 * DAY);
  const oneMonth = new Date(now.getTime() + 30 * DAY);

  const buckets: CashForecast["buckets"] = { thisWeek: [], nextWeek: [], thisMonth: [], beyond: [] };
  for (const f of forecastInvoices) {
    if (f.expectedDate <= oneWeek) buckets.thisWeek.push(f);
    else if (f.expectedDate <= twoWeeks) buckets.nextWeek.push(f);
    else if (f.expectedDate <= oneMonth) buckets.thisMonth.push(f);
    else buckets.beyond.push(f);
  }
  for (const bucket of Object.values(buckets)) bucket.sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime());

  const totalExpectedCents = forecastInvoices.reduce((sum, f) => sum + f.amountCents, 0);

  return { totalExpectedCents, totalAtRiskCents, buckets, atRisk };
}
