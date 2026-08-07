// SQLite has no native enum type, so the schema stores these as String.
// Single source of truth for allowed values.

export const INVOICE_STATUSES = ["open", "paid", "disputed", "written_off"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const REMINDER_STAGES = ["upcoming", "overdue_1", "overdue_2", "overdue_3", "final_notice"] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];

export const REMINDER_STATUSES = ["pending", "drafted", "sent_log_only", "paused"] as const;
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];

export const REPLY_CLASSIFICATIONS = ["dispute", "promise_to_pay", "question", "already_paid", "other"] as const;
export type ReplyClassification = (typeof REPLY_CLASSIFICATIONS)[number];

export const DISPUTE_STATUSES = ["open", "resolved"] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const PROMISE_STATUSES = ["pending", "kept", "broken"] as const;
export type PromiseStatus = (typeof PROMISE_STATUSES)[number];

export const RISK_LABELS = ["low", "medium", "high"] as const;
export type RiskLabel = (typeof RISK_LABELS)[number];
