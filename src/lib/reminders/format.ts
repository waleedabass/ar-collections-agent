import { formatMoney } from "@/lib/format";
import { stageTone, type ReminderDraftInput } from "./types";

export function formatReminderPrompt(input: ReminderDraftInput): string {
  return `Tone for this reminder: ${stageTone(input.stage)}

Customer: ${input.customerName} (contact: ${input.contactName})
Invoice: ${input.invoiceNumber}
Description: ${input.description}
Amount due: ${formatMoney(input.amountCents)}
Due date: ${input.dueDateISO}
Days overdue: ${input.daysOverdue > 0 ? input.daysOverdue : "not yet due"}`;
}
