import Link from "next/link";
import { db } from "@/lib/db";
import { resolveDisputeAction } from "@/lib/actions";
import { formatMoney, timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function DisputesPage() {
  const disputes = await db.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: { invoice: { include: { customer: true } } },
  });

  const open = disputes.filter((d) => d.status === "open");
  const resolved = disputes.filter((d) => d.status === "resolved");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Collections
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Dispute queue</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Every open dispute has already paused its invoice&apos;s reminder sequence — resolving one resumes it.
        </p>
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">
          Open <span className="mono text-xs font-normal" style={{ color: "var(--muted-2)" }}>({open.length})</span>
        </h2>
        {open.length === 0 ? (
          <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>Nothing open.</p>
        ) : (
          <div className="flex flex-col">
            {open.map((dispute) => (
              <div key={dispute.id} className="flex flex-col gap-3 px-5 py-4 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link href={`/invoices/${dispute.invoiceId}`} className="text-sm font-medium underline">
                      {dispute.invoice.invoiceNumber} — {dispute.invoice.customer.companyName}
                    </Link>
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-2)" }}>{timeAgo(dispute.createdAt)}</p>
                  </div>
                  <span className="mono text-sm tabular-nums shrink-0">{formatMoney(dispute.invoice.amountCents)}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>{dispute.description}</p>
                <form action={resolveDisputeAction.bind(null, dispute.id)} className="flex gap-2 items-start flex-wrap">
                  <textarea name="resolutionNote" required rows={1} className="field" style={{ flex: 1, minWidth: 200 }} placeholder="Resolution note..." />
                  <button type="submit" className="btn btn-primary shrink-0">Resolve &amp; resume →</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div className="panel overflow-hidden">
          <h2 className="text-sm font-semibold p-5 pb-3">Resolved</h2>
          <div className="flex flex-col">
            {resolved.map((dispute) => (
              <div key={dispute.id} className="px-5 py-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/invoices/${dispute.invoiceId}`} className="text-sm font-medium underline">
                    {dispute.invoice.invoiceNumber} — {dispute.invoice.customer.companyName}
                  </Link>
                  <span className={`chip chip-${toneFor(dispute.status)}`}>{dispute.status}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>{dispute.resolutionNote}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
