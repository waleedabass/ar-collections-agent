import Link from "next/link";
import { computeCashForecast, type ForecastInvoice } from "@/lib/forecast";
import { formatMoney, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const BUCKET_LABELS: Record<string, string> = {
  thisWeek: "This week",
  nextWeek: "Next week",
  thisMonth: "This month",
  beyond: "Beyond 30 days",
};

export default async function CashForecastPage() {
  const forecast = await computeCashForecast();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Collections
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Cash forecast</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Expected collection dates, computed deterministically — a pending promise-to-pay date if one exists,
          otherwise the due date pushed out by that customer&apos;s own historical average days-late.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="panel p-4">
          <p className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Total expected</p>
          <span className="text-2xl font-semibold tabular-nums">{formatMoney(forecast.totalExpectedCents)}</span>
        </div>
        <div className="panel p-4">
          <p className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Cash at risk (disputed)</p>
          <span className="text-2xl font-semibold tabular-nums">{formatMoney(forecast.totalAtRiskCents)}</span>
        </div>
      </div>

      {Object.entries(forecast.buckets).map(([key, items]) => (
        <BucketPanel key={key} label={BUCKET_LABELS[key]} items={items} />
      ))}

      {forecast.atRisk.length > 0 && (
        <div className="panel overflow-hidden">
          <h2 className="text-sm font-semibold p-5 pb-3">
            At risk — disputed, no forecast date{" "}
            <span className="mono text-xs font-normal" style={{ color: "var(--muted-2)" }}>({forecast.atRisk.length})</span>
          </h2>
          <div className="flex flex-col">
            {forecast.atRisk.map((i) => (
              <Link
                key={i.invoiceId}
                href={`/invoices/${i.invoiceId}`}
                className="flex items-center justify-between gap-4 px-5 py-3 border-t"
                style={{ borderColor: "var(--line-soft)" }}
              >
                <span className="text-sm">{i.invoiceNumber} — {i.customerName}</span>
                <span className="mono text-sm tabular-nums">{formatMoney(i.amountCents)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BucketPanel({ label, items }: { label: string; items: ForecastInvoice[] }) {
  const total = items.reduce((sum, i) => sum + i.amountCents, 0);
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between p-5 pb-3">
        <h2 className="text-sm font-semibold">{label}</h2>
        <span className="mono text-sm tabular-nums">{formatMoney(total)}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>Nothing expected in this window.</p>
      ) : (
        <div className="flex flex-col">
          {items.map((i) => (
            <Link
              key={i.invoiceId}
              href={`/invoices/${i.invoiceId}`}
              className="flex items-center justify-between gap-4 px-5 py-3 border-t"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{i.invoiceNumber} — {i.customerName}</div>
                <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                  expected {formatDate(i.expectedDate)} · {i.basis === "promise" ? "based on their promise" : "based on payment history"}
                </div>
              </div>
              <span className="mono text-sm tabular-nums shrink-0">{formatMoney(i.amountCents)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
