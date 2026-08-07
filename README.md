# AI Accounts Receivable & Collections Agent

A working prototype of ARC Automations' AR collections product, built around the brief's own contrast: "average systems send reminders. Agency systems distinguish disputes from delays, preserve customer relationships, coordinate email and SMS, stop inappropriate follow-ups, and provide auditable payment status." The core proof point is the demo scenario itself — a customer reply that's actually a billing dispute gets recognized as one (not just another slow payment), and the reminder sequence stops automatically until a human resolves it.

Fictional vendor: **Brackenridge Wholesale Supply** (B2B industrial/hardware distributor, NET-30 terms). Demo customer: **Prairie Hardware Co.**, whose invoice INV-1042 is the scripted wrong-quantity dispute.

## What's real right now, with zero paid accounts

- **Deterministic dunning schedule** — the moment an invoice exists, all five reminder stages (a friendly heads-up before the due date, then progressively firmer reminders at fixed overdue milestones) are computed and scheduled in plain code from the real due date. Nothing about the schedule is AI-guessed.
- **AI-drafted reminders with a tone that actually escalates** — verified live: a "Friendly Reminder" heads-up, a polite first nudge, a firmer second notice, a direct third request, and a formal final notice, each grounded in the real invoice facts and never inventing a late fee or policy that wasn't given to it.
- **Real reply classification that distinguishes disputes from delays** — the brief's own demo scenario, verified live end to end: a wrong-quantity complaint gets classified as `dispute` (not `promise_to_pay` or generic), which pauses every pending reminder on that invoice and opens a real dispute record; a "we'll pay by next Friday" reply gets classified as `promise_to_pay` with the relative date correctly resolved to a real calendar date.
- **Deterministic account risk scoring** across a customer's full invoice/dispute/promise history — open disputes, broken payment promises, overdue invoice count, and days overdue each contribute real, inspectable points, with an AI-written narrative explaining the computed number, not inventing one.
- **Real statistical anomaly detection** — an invoice priced sharply above or below a customer's own historical average gets flagged in plain code at creation time (verified live: a $28,750 invoice against a $6,000 historical average, correctly flagged at 4.8x).
- **A real deterministic cash forecast** — expected collection dates come from a pending promise-to-pay date when one exists, otherwise the due date pushed out by that customer's own real historical average days-late, computed from their actual paid invoices.
- **Real Stripe test-mode Checkout Sessions** — the standout real integration here: unlike every other AP/AR system the brief names (QuickBooks, Xero, NetSuite, Chargebee all require a registered, reviewed OAuth app), a Stripe test secret key needs zero business verification. Code is written and correct against Stripe's documented Checkout Sessions API; not verified against a live Stripe account in this build session (no key was available) — verify it yourself by adding `STRIPE_SECRET_KEY` and generating a payment link.

## What needs a key from you, in the order to get them

| Stage | Provider | Cost to start | Env var |
|---|---|---|---|
| Reply classification, reminder drafting, risk explanation | [Anthropic](https://console.anthropic.com), [Google AI Studio](https://aistudio.google.com/apikey), or [OpenRouter](https://openrouter.ai/keys) | Anthropic: pay-as-you-go. Gemini/OpenRouter: free tier. | `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENROUTER_API_KEY` |
| Real payment links | [Stripe test mode](https://dashboard.stripe.com/test/apikeys) | Free, no verification | `STRIPE_SECRET_KEY` |

Copy `.env.example` to `.env` and fill in what you have.

## Running it

```bash
npm install
npm run seed       # seeds Brackenridge's 3 demo customers + invoices across aging stages
npm run dev
```

Then:

1. **`/`** — the aging dashboard: total outstanding/overdue, aging buckets, anomaly flags.
2. **`/invoices/[id]`** — open Prairie Hardware Co.'s INV-1042 (or Thornbury's severely-overdue INV-3001) and use "Simulate a customer reply" to try the real dispute-detection flow — type a message contesting the invoice (wrong quantity, wrong item, etc.) and watch the reminder sequence pause automatically. Try a "we'll pay by [date]" message too, to see promise-to-pay extraction.
3. **`/disputes`** — resolve the dispute you just created and watch the invoice's reminders resume.
4. `npm run reminders` — drafts every reminder whose scheduled date has arrived (several are already due on the seeded data). Review one at **`/invoices/[id]/reminders/[id]`**, edit if you like, and approve-and-log it.
5. **`/customers/[id]`** — the account profile: risk score with its real factor breakdown, invoice history, full communication history.
6. **`/cash-forecast`** — expected collections by time bucket, computed from real aging + promise data.
7. **`/pay/[invoiceId]`** — get a payment link (real Stripe if you've added a key, logged otherwise).

## Architecture notes

- **Same conventions as the other five ARC projects**: Next.js 16 + Prisma 7 with the `@prisma/adapter-better-sqlite3` driver adapter, Server Actions for mutations, provider interfaces (`ReplyClassificationProvider`, `ReminderDraftProvider`, `RiskExplainProvider`, `PaymentProvider`) so a real upgrade slots in without touching business logic. Same 8-color minimal palette across all six, for a portfolio that reads as one body of work.
- **Scheduling, risk scoring, anomaly detection, and cash forecasting are all deliberately not AI** — deterministic, inspectable, reproducible. The brief's own differentiator against "average" tools is auditable status; an AI-guessed schedule or risk number would fail that test outright.
- **Reply simulation, not real inbound email** — same honest gap as `signal-outbound-engine`'s reply simulator: there's no real inbound-email integration in this portfolio, so exercising the classification pipeline works through a form instead of an actual mailbox.
- **QuickBooks/Xero/NetSuite/Chargebee invoice sync isn't built at all** — all four require a registered, reviewed marketplace OAuth app, same bucket as QuickBooks/Xero in `document-ai`. Twilio SMS isn't built either — unlike Stripe, it needs its own account/credentials for a feature (SMS coordination) that isn't the core demo, so the signup friction wasn't worth it for what it would add here.
- **No real email-sending integration** exists anywhere in this portfolio yet — approving a reminder always logs what would be sent.

## Known limitations, on purpose

- Stripe integration is written against the documented API but not live-verified in this build session — add a real test key and generate a payment link yourself to confirm.
- A customer's "historical average days-late" needs at least one real paid invoice with a recorded `paidAt` to be meaningful; a brand-new customer's forecast falls back to their invoices' plain due dates.
- Anomaly detection is a simple ratio-against-mean check — a customer with only one or two prior invoices has a thin baseline to compare against, same honest caveat any real statistical check has at low sample sizes.
- Promise-to-pay dates are resolved by the AI model against the actual current date at classification time — reasonable for "next Friday" style phrasing, but not something to bet a real production system's data integrity on without a second, deterministic validation pass.
