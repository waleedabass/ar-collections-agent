# AI Accounts Receivable & Collections Agent — Pitch Guide & Productionization Kit

Repo: https://github.com/waleedabass/ar-collections-agent

---

## 1. Production-Conversion Prompt

```
I'm taking the ar-collections-agent prototype to production for a real
client. Read AGENTS.md, CLAUDE.md, and README.md first, then do the
following:

CLIENT CONTEXT
- Client: [CLIENT_NAME], [INVOICE_VOLUME] invoices/month, payment terms
  [CLIENT_PAYMENT_TERMS — NET30/NET15/other]
- Accounting system of record: [QUICKBOOKS / XERO / NETSUITE / CHARGEBEE]
- Who reviews/approves reminders and resolves disputes: [CLIENT_AR_TEAM]

INVOICE SYNC (the real gap to close)
- The prototype has no real invoice ingestion — invoices are seeded
  manually. Register a real OAuth app with [QUICKBOOKS/XERO/NETSUITE/
  CHARGEBEE] (this is a genuine multi-day approval process, start early)
  and build a real sync job that creates/updates Invoice rows (and their
  reminder schedules, via createInvoiceWithSchedule) from the client's
  actual AR data, on a real recurring schedule.

DUNNING SCHEDULE
- Review src/lib/reminders/schedule.ts's cadence (heads-up 3 days before
  due, then +1/+7/+14/+30 days overdue) against [CLIENT_NAME]'s actual
  collections policy — adjust the stages/timing to match.

RISK SCORING
- Review src/lib/risk/score.ts's point weights against [CLIENT_NAME]'s
  real collections risk tolerance and historical write-off data — tune the
  thresholds so "medium"/"high" actually correlate with accounts that
  historically needed intervention.

PAYMENTS
- Get [CLIENT_NAME]'s own Stripe account (live mode, not test) and
  STRIPE_SECRET_KEY — the Checkout Session code is already real and
  correct, it just needs their real key and APP_BASE_URL pointed at the
  production domain.
- If they use a different processor (Chargebee, their own merchant
  account), implement it behind the existing PaymentProvider interface.

COMMUNICATIONS
- Wire a real email-sending provider (SendGrid, Postmark, or their ESP) —
  approving a reminder currently only logs it; production needs it to
  actually send.
- If SMS coordination matters for this client specifically, build a real
  Twilio integration at that point — it was deliberately left out of the
  prototype since it needed its own account for a feature that wasn't the
  core demo; revisit if the client's collections process genuinely uses
  SMS.
- Build a real inbound-reply path (an email webhook, e.g. via their ESP's
  inbound-parse feature) to replace the manual "simulate a customer reply"
  demo tool with real customer replies triggering real classification.

DATA LAYER
- Replace SQLite with Postgres — [CONNECTION_STRING].

DEPLOYMENT
- Deploy to [VERCEL/CLIENT_INFRA], custom domain, environment variables
  from Section 2.
- Add authentication + role-based access (AR team vs. finance leadership
  view) — the prototype has none.
- Schedule npm run reminders as a real recurring job (cron/Vercel Cron/
  client infra), not a manual script.

Test end-to-end with a handful of the client's real invoices and a real
dispute scenario before handoff.
```

---

## 2. Client Details Needed

**Brand & identity**
- Company name, logo, brand colors for reminder emails and the payment page

**Invoicing & terms**
- Accounting system (QuickBooks/Xero/NetSuite/Chargebee), and who owns getting the OAuth app registered/approved
- Real payment terms (NET15/30/45/60) and whether it varies by customer
- Their actual dunning cadence/policy if different from heads-up + 4 escalating reminders

**Payments**
- Live Stripe account (or their existing processor) credentials
- Whether payment plans/partial payments need to be supported (not in the prototype)

**Risk & collections**
- Historical data on which accounts became write-offs, if available, to calibrate risk-score thresholds meaningfully
- Who gets escalated high-risk accounts, and what "escalation" means in their process (a person, a collections agency, legal)

**Communications**
- Real ESP for sending reminders (SendGrid/Postmark/other), and their inbound-reply handling if they want real customer replies auto-classified
- Whether SMS is actually part of their collections process (adds real scope if so — a genuine Twilio integration, not just a log)

**Review workflow**
- Who reviews/approves drafted reminders day to day, and whether every reminder needs approval or only certain stages (e.g. final notices always need a human, early reminders could auto-send)
- Who resolves disputes and what their resolution process actually looks like (credit memo, replacement shipment, price adjustment)

**Compliance**
- Collections-communication regulations applicable to their region (FDCPA-adjacent rules if this touches consumer debt, not just B2B)

**Access & auth**
- AR team roster with role assignments, preferred auth method

**Infra**
- Hosting preference, custom domain, database, expected invoice volume for capacity planning

---

## 3. Pitch Guide — Everything This Product Does

### The problem it solves

Late invoices directly hurt cash flow, and the ROI of fixing that is easy to calculate — unlike a lot of AI projects. But most collections processes are either fully manual (reps forget, apply inconsistent tone, miss disputes) or fully automated in the worst way (a dumb reminder that keeps firing at a customer who already told you the invoice is wrong, damaging the relationship).

### The pitch, feature by feature

**1. A deterministic reminder schedule, not a manual to-do list**
The moment an invoice exists, its entire reminder sequence is scheduled automatically — a friendly heads-up before it's even due, then progressively firmer reminders at fixed milestones. Nobody has to remember to follow up.

**2. AI-drafted reminders with a tone that actually escalates**
Each reminder is grounded in the real invoice facts and matches its stage — genuinely friendly at first, firm by the third reminder, formal at the final notice — without ever inventing a late fee or policy that wasn't actually given to it.

**3. The single most important feature: disputes get recognized as disputes**
When a customer replies contesting something about the invoice — wrong quantity, wrong item, already paid — the system reads that reply, classifies it correctly, and automatically pauses every future reminder on that invoice. This is the exact gap the brief calls out: the average tool would have kept hammering that customer with reminders on an invoice that might not even be correct as billed, which is exactly what damages a customer relationship.

**4. A real dispute queue with a resolve-and-resume workflow**
Every paused invoice sits in a queue until a human resolves it with a note — at which point the reminder sequence automatically picks back up, right where it left off.

**5. Promise-to-pay tracking, with real date extraction**
When a customer commits to a specific date ("we'll pay by next Friday"), the system extracts that real commitment — resolving relative language against the actual calendar — and tracks whether it's kept or broken.

**6. Deterministic account-risk scoring, not a guess**
Every customer's risk score is computed from real, auditable factors — open disputes, broken promises, how many invoices are overdue, how severely — with an AI narrative explaining the number in plain language.

**7. Real statistical anomaly detection**
An invoice priced sharply outside a customer's own historical pattern gets flagged automatically — a real check against billing errors or fraud, computed in plain code, not an AI guess.

**8. A deterministic cash forecast**
Expected collection dates come from real data — a customer's actual promise, or their own historical payment-lateness pattern — giving finance a genuinely evidence-based forecast instead of "assume everyone pays on the due date."

**9. Real payment links**
Every invoice gets a real, working payment link (Stripe test/live checkout), so a customer can pay in one click straight from the reminder.

### Why this is agency-grade, not "average"

An average AR tool sends reminders on a timer and stops there. This system does what the brief itself names as the differentiator: it distinguishes a dispute from a delay, stops inappropriate follow-ups automatically, tracks whether payment promises are actually kept, and gives finance leadership an auditable, evidence-based view of both risk and cash flow — not a black box, and not a tool that damages customer relationships by refusing to notice when something's actually wrong.

### Recurring revenue angle

- Monthly collections-management fee, scaled by invoice volume
- Per-invoice processing fee as an alternative pricing model
- Integration setup fee per accounting/payment platform connected
- Upsell: invoice generation, payment reconciliation, document processing for supporting paperwork, cash-flow forecasting for the whole business (not just AR)

### Suggested live demo script

1. Show the aging dashboard — real cash-at-risk, real aging buckets, an anomaly-flagged invoice.
2. Open a severely overdue invoice, show its full reminder timeline.
3. Simulate a customer reply disputing the invoice (wrong quantity) — show it correctly classified as a dispute, not a delay, and every future reminder pausing automatically. This is the single best "average vs. agency" moment in the whole demo.
4. Resolve the dispute and show the reminder sequence resuming.
5. Simulate a "we'll pay by [date]" reply — show the real date extraction and the cash forecast updating to reflect it.
6. Show the customer's risk score and its real factor breakdown.
