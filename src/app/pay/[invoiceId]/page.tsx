import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { createPaymentSessionAction } from "@/lib/actions";
import { formatMoney, formatDate } from "@/lib/format";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function PayPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { customer: true, paymentSessions: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!invoice) notFound();

  const latestSession = invoice.paymentSessions[0];

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
      <div className="text-center">
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          Brackenridge Wholesale Supply
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Pay invoice {invoice.invoiceNumber}</h1>
      </div>

      <div className="panel p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--muted)" }}>Billed to</span>
          <span className="text-sm font-medium">{invoice.customer.companyName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--muted)" }}>Description</span>
          <span className="text-sm">{invoice.description}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--muted)" }}>Due date</span>
          <span className="text-sm">{formatDate(invoice.dueDate)}</span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--line-soft)" }}>
          <span className="text-sm font-semibold">Amount due</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(invoice.amountCents)}</span>
        </div>
        <span className={`chip chip-${toneFor(invoice.status)} self-start`}>{invoice.status}</span>
      </div>

      {invoice.status === "paid" ? (
        <div className="panel p-6 text-center">
          <p className="text-sm">This invoice has already been paid — thank you.</p>
        </div>
      ) : latestSession ? (
        latestSession.provider === "stripe" ? (
          <a href={latestSession.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary text-center">
            Pay {formatMoney(invoice.amountCents)} with Stripe →
          </a>
        ) : (
          <div className="panel p-5">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              No payment provider is configured yet (set <code className="mono">STRIPE_SECRET_KEY</code> in <code className="mono">.env</code>)
              — this logged what would have been a real Stripe test-mode checkout session instead of creating one. See README.
            </p>
          </div>
        )
      ) : (
        <form action={createPaymentSessionAction.bind(null, invoice.id)}>
          <button type="submit" className="btn btn-primary w-full">Get payment link →</button>
        </form>
      )}
    </div>
  );
}
