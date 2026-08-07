import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { simulateReplyAction, markInvoicePaidAction, resolveDisputeAction } from "@/lib/actions";
import { formatMoney, formatDate, formatDateTime } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      reminderSteps: { orderBy: { scheduledFor: "asc" } },
      disputes: { orderBy: { createdAt: "desc" } },
      promisesToPay: { orderBy: { createdAt: "desc" } },
      replies: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const openDispute = invoice.disputes.find((d) => d.status === "open");
  const pendingPromise = invoice.promisesToPay.find((p) => p.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
            <Link href={`/customers/${invoice.customerId}`} className="underline">
              {invoice.customer.companyName}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">
            {invoice.invoiceNumber} — {formatMoney(invoice.amountCents)}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {invoice.description} · issued {formatDate(invoice.issueDate)} · due {formatDate(invoice.dueDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pay/${invoice.id}`} className="btn">Payment page</Link>
          {invoice.status === "open" && (
            <form action={markInvoicePaidAction.bind(null, invoice.id)}>
              <button type="submit" className="btn">Mark as paid</button>
            </form>
          )}
          <span className={`chip chip-${toneFor(invoice.status)}`}>{invoice.status}</span>
        </div>
      </div>

      {invoice.anomalyFlag && (
        <div className="panel p-4" style={{ borderColor: "var(--muted-2)" }}>
          <p className="text-sm">
            <span className="mono text-xs uppercase tracking-wide mr-2" style={{ color: "var(--muted-2)" }}>⚠ Anomaly</span>
            {invoice.anomalyReason}
          </p>
        </div>
      )}

      {openDispute && (
        <div className="panel p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="chip chip-danger">Dispute open — reminders paused</span>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{openDispute.description}</p>
          <form action={resolveDisputeAction.bind(null, openDispute.id)} className="flex flex-col gap-2">
            <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>
              Resolution note
            </label>
            <textarea name="resolutionNote" required rows={2} className="field" placeholder="e.g. Corrected quantity, credit memo issued for the difference." />
            <button type="submit" className="btn btn-primary self-start">Resolve &amp; resume reminders →</button>
          </form>
        </div>
      )}

      {pendingPromise && (
        <div className="panel p-4">
          <p className="text-sm">
            <span className="chip chip-info mr-2">Promise to pay</span>
            Customer committed to pay by {formatDate(pendingPromise.promisedDate)}
            {pendingPromise.promisedAmountCents && <> ({formatMoney(pendingPromise.promisedAmountCents)})</>}.
          </p>
        </div>
      )}

      <div className="panel overflow-hidden">
        <h2 className="text-sm font-semibold p-5 pb-3">Reminder workflow</h2>
        <div className="flex flex-col">
          {invoice.reminderSteps.map((step) => (
            <div key={step.id} className="flex items-center justify-between gap-4 px-5 py-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
              <div className="min-w-0">
                <div className="text-sm font-medium">{step.stage.replace(/_/g, " ")}</div>
                <div className="text-xs" style={{ color: "var(--muted-2)" }}>
                  scheduled {formatDate(step.scheduledFor)}
                  {step.sentAt && <> · sent {formatDateTime(step.sentAt)}</>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {step.status === "drafted" && (
                  <Link href={`/invoices/${invoice.id}/reminders/${step.id}`} className="btn btn-primary">
                    Review draft →
                  </Link>
                )}
                <span className={`chip chip-${toneFor(step.status)}`}>{step.status.replace(/_/g, " ")}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="text-sm font-semibold mb-2">Simulate a customer reply</h2>
        <p className="text-xs mb-3" style={{ color: "var(--muted-2)" }}>
          No real inbound email integration exists — this is the demo path for exercising real AI reply classification.
        </p>
        <form action={simulateReplyAction.bind(null, invoice.id)} className="flex flex-col gap-2">
          <textarea name="replyText" required rows={3} className="field" placeholder="Type what the customer would say back..." />
          <button type="submit" className="btn btn-primary self-start">Send reply →</button>
        </form>
      </div>

      {invoice.replies.length > 0 && (
        <div className="panel overflow-hidden">
          <h2 className="text-sm font-semibold p-5 pb-3">Reply history</h2>
          <div className="flex flex-col">
            {invoice.replies.map((reply) => (
              <div key={reply.id} className="px-5 py-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
                <span className={`chip chip-${toneFor(reply.classification)} mb-1`}>{reply.classification.replace(/_/g, " ")}</span>
                <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>&ldquo;{reply.rawText}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
