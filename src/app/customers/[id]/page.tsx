import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney, formatDate, timeAgo } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      invoices: { orderBy: { issueDate: "desc" } },
      riskFactors: { orderBy: { points: "desc" } },
    },
  });
  if (!customer) notFound();

  const invoiceIds = customer.invoices.map((i) => i.id);
  const replies = await db.customerReply.findMany({
    where: { invoiceId: { in: invoiceIds } },
    include: { invoice: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            Account profile
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{customer.companyName}</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {customer.contactName} · {customer.contactEmail} · NET-{customer.paymentTermsDays}
          </p>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Account risk</h2>
          {customer.riskScore !== null && (
            <div className="flex items-center gap-2">
              <span className="mono text-2xl font-semibold tabular-nums">{customer.riskScore}/100</span>
              <span className={`chip chip-${toneFor(customer.riskLabel ?? "low")}`}>{customer.riskLabel}</span>
            </div>
          )}
        </div>
        {customer.riskExplanation ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>{customer.riskExplanation}</p>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Not scored yet.</p>
        )}
        {customer.riskFactors.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-4">
            {customer.riskFactors.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--muted)" }}>{f.label}</span>
                <span className="mono">+{f.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">Invoices</h2>
        <div className="flex flex-col">
          {customer.invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3 border-t"
              style={{ borderColor: "var(--line-soft)" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">
                  {invoice.invoiceNumber} — {invoice.description}
                  {invoice.anomalyFlag && <span className="mono text-xs ml-2" style={{ color: "var(--muted-2)" }}>⚠ anomaly</span>}
                </div>
                <div className="text-xs truncate" style={{ color: "var(--muted-2)" }}>
                  Issued {formatDate(invoice.issueDate)} · due {formatDate(invoice.dueDate)}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="mono text-sm tabular-nums">{formatMoney(invoice.amountCents)}</span>
                <span className={`chip chip-${toneFor(invoice.status)}`}>{invoice.status}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">Communication history</h2>
        {replies.length === 0 ? (
          <p className="text-sm px-5 pb-5" style={{ color: "var(--muted)" }}>No replies yet.</p>
        ) : (
          <div className="flex flex-col">
            {replies.map((reply) => (
              <div key={reply.id} className="px-5 py-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`chip chip-${toneFor(reply.classification)}`}>{reply.classification.replace(/_/g, " ")}</span>
                  <Link href={`/invoices/${reply.invoiceId}`} className="text-xs underline" style={{ color: "var(--muted-2)" }}>
                    {reply.invoice.invoiceNumber}
                  </Link>
                  <span className="text-xs" style={{ color: "var(--muted-2)" }}>{timeAgo(reply.createdAt)}</span>
                </div>
                <p className="text-sm" style={{ color: "var(--muted)" }}>&ldquo;{reply.rawText}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
