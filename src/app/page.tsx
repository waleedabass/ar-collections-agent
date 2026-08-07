import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function daysOverdue(dueDate: Date): number {
  return Math.floor((Date.now() - dueDate.getTime()) / DAY);
}

export default async function AgingDashboardPage() {
  const invoices = await db.invoice.findMany({
    where: { status: { in: ["open", "disputed"] } },
    include: { customer: true },
    orderBy: { dueDate: "asc" },
  });

  const totalOutstandingCents = invoices.reduce((sum, i) => sum + i.amountCents, 0);
  const overdueInvoices = invoices.filter((i) => daysOverdue(i.dueDate) > 0);
  const totalOverdueCents = overdueInvoices.reduce((sum, i) => sum + i.amountCents, 0);
  const disputedInvoices = invoices.filter((i) => i.status === "disputed");
  const anomalousInvoices = invoices.filter((i) => i.anomalyFlag);

  const buckets = {
    current: invoices.filter((i) => daysOverdue(i.dueDate) <= 0),
    "1-30": invoices.filter((i) => daysOverdue(i.dueDate) > 0 && daysOverdue(i.dueDate) <= 30),
    "31-60": invoices.filter((i) => daysOverdue(i.dueDate) > 30 && daysOverdue(i.dueDate) <= 60),
    "61-90": invoices.filter((i) => daysOverdue(i.dueDate) > 60 && daysOverdue(i.dueDate) <= 90),
    "90+": invoices.filter((i) => daysOverdue(i.dueDate) > 90),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Collections
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Aging dashboard</h1>
      </div>

      {invoices.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>No open invoices — run the seed script first.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatTile label="Total outstanding" value={formatMoney(totalOutstandingCents)} />
            <StatTile label="Total overdue" value={formatMoney(totalOverdueCents)} sub={`${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"}`} />
            <StatTile label="Open disputes" value={String(disputedInvoices.length)} />
            <StatTile label="Anomaly flags" value={String(anomalousInvoices.length)} />
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold mb-4">Aging buckets</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Object.entries(buckets).map(([label, items]) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>{label} days</span>
                  <span className="text-lg font-semibold tabular-nums">{formatMoney(items.reduce((s, i) => s + i.amountCents, 0))}</span>
                  <span className="mono text-xs" style={{ color: "var(--muted-2)" }}>{items.length} invoice{items.length === 1 ? "" : "s"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <h2 className="text-sm font-semibold p-5 pb-3">Open invoices</h2>
            <div className="flex flex-col">
              {invoices.map((invoice) => {
                const overdue = daysOverdue(invoice.dueDate);
                return (
                  <Link
                    key={invoice.id}
                    href={`/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 border-t"
                    style={{ borderColor: "var(--line-soft)" }}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {invoice.invoiceNumber} — {invoice.customer.companyName}
                        {invoice.anomalyFlag && <span className="mono text-xs ml-2" style={{ color: "var(--muted-2)" }}>⚠ anomaly</span>}
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                        {overdue > 0 ? `${overdue} days overdue` : "not yet due"}
                        {invoice.customer.riskLabel && <> · {invoice.customer.riskLabel} risk</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="mono text-sm tabular-nums">{formatMoney(invoice.amountCents)}</span>
                      <span className={`chip chip-${toneFor(invoice.status)}`}>{invoice.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel p-4">
      <p className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {sub && <span className="mono text-xs" style={{ color: "var(--muted)" }}>{sub}</span>}
      </div>
    </div>
  );
}
