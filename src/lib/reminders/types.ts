import type { ReminderStage } from "@/lib/enums";

export interface ReminderDraftInput {
  customerName: string;
  contactName: string;
  invoiceNumber: string;
  description: string;
  amountCents: number;
  dueDateISO: string;
  daysOverdue: number; // negative means not yet due
  stage: ReminderStage;
}

export interface ReminderDraftResult {
  subject: string;
  body: string;
}

export interface ReminderDraftProvider {
  name: string;
  draft(input: ReminderDraftInput): Promise<ReminderDraftResult>;
}

const STAGE_TONE: Record<ReminderStage, string> = {
  upcoming: "Friendly heads-up. The invoice isn't overdue yet — just a courteous reminder it's coming due soon. Warm, no urgency.",
  overdue_1: "Polite first reminder. Assume it's simply been missed. No pressure, just a clear nudge with the amount and due date.",
  overdue_2: "Firmer follow-up. This is the second reminder — acknowledge it's now meaningfully overdue, ask for either payment or a status update.",
  overdue_3: "Firm reminder. Multiple reminders have gone unanswered — direct, professional, ask for a specific response (payment or a promised date) this week.",
  final_notice: "Final notice. Formal and serious in tone but still professional and courteous — state this is the final reminder before the account is escalated for collections review. Never threaten legal action or invent a specific late fee or policy that wasn't given to you.",
};

export function stageTone(stage: ReminderStage): string {
  return STAGE_TONE[stage];
}

export const REMINDER_SYSTEM_PROMPT = `You draft a short accounts-receivable reminder email from Brackenridge Wholesale Supply's collections team to a customer about one specific unpaid invoice.

Ground the email ONLY in the invoice/customer facts provided — never invent a late fee, a specific policy, a promised call, or any detail not given. Keep it brief (3-6 sentences), professional, and match the tone instruction for this reminder's stage exactly. Always state the invoice number, amount, and due date plainly. End with a sign-off from "The Brackenridge Wholesale Supply Collections Team".`;
