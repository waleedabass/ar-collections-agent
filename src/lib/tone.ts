// Maps the many status/label strings across this project's enums to one of
// five chip tones — cheaper than a CSS class per enum value (see globals.css).
export type Tone = "neutral" | "info" | "good" | "warn" | "danger";

const TONE_BY_VALUE: Record<string, Tone> = {
  // Invoice.status
  open: "info",
  paid: "good",
  disputed: "danger",
  written_off: "neutral",
  // ReminderStep.status
  pending: "neutral",
  drafted: "info",
  sent_log_only: "good",
  paused: "warn",
  // Dispute.status
  resolved: "good",
  // PromiseToPay.status
  kept: "good",
  broken: "danger",
  // Customer.riskLabel
  low: "good",
  medium: "warn",
  high: "danger",
  // CustomerReply.classification
  dispute: "danger",
  promise_to_pay: "info",
  question: "neutral",
  already_paid: "good",
  other: "neutral",
};

export function toneFor(status: string): Tone {
  return TONE_BY_VALUE[status] ?? "neutral";
}
