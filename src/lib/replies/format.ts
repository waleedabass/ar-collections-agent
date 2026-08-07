import { formatMoney } from "@/lib/format";
import type { ReplyClassificationInput } from "./types";

export function formatReplyPrompt(input: ReplyClassificationInput): string {
  const todayISO = new Date().toISOString().slice(0, 10);
  return `Today's date: ${todayISO}

Invoice: ${input.invoiceNumber}
Description: ${input.description}
Amount due: ${formatMoney(input.amountCents)}
Due date: ${input.dueDateISO}

Customer's reply:
"""
${input.rawText}
"""`;
}
