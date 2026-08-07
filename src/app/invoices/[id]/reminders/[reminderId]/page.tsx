import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { approveAndSendReminderAction } from "@/lib/actions";
import { toneFor } from "@/lib/tone";

export const dynamic = "force-dynamic";

export default async function ReminderPreviewPage({ params }: { params: Promise<{ id: string; reminderId: string }> }) {
  const { id, reminderId } = await params;
  const step = await db.reminderStep.findUnique({
    where: { id: reminderId },
    include: { invoice: { include: { customer: true } } },
  });
  if (!step || step.invoiceId !== id) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mono text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>
          <Link href={`/invoices/${step.invoiceId}`} className="underline">
            {step.invoice.invoiceNumber} — {step.invoice.customer.companyName}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">
          {step.stage.replace(/_/g, " ")} reminder
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          To {step.invoice.customer.contactName} ({step.invoice.customer.contactEmail}). No email provider is wired
          up in this prototype — approving always logs exactly what would be sent rather than sending it.
        </p>
      </div>

      <div className="panel p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Draft</span>
          <span className={`chip chip-${toneFor(step.status)}`}>{step.status.replace(/_/g, " ")}</span>
        </div>

        {step.status === "drafted" ? (
          <form action={approveAndSendReminderAction.bind(null, step.id)} className="flex flex-col gap-3">
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Subject</label>
              <input name="subject" defaultValue={step.subject ?? ""} required className="field mt-1" />
            </div>
            <div>
              <label className="mono text-xs uppercase tracking-wide" style={{ color: "var(--muted-2)" }}>Body</label>
              <textarea name="body" defaultValue={step.body ?? ""} required rows={7} className="field mt-1" />
            </div>
            <button type="submit" className="btn btn-primary self-start">Approve &amp; send →</button>
          </form>
        ) : step.subject ? (
          <div>
            <p className="text-sm font-medium mb-1">{step.subject}</p>
            <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--muted)" }}>{step.body}</p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Not drafted yet — run <code className="mono">npm run reminders</code> once this step&apos;s scheduled date has arrived.
          </p>
        )}
      </div>
    </div>
  );
}
