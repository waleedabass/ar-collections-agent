import { formatMoney } from "@/lib/format";

export interface AnomalyResult {
  flag: boolean;
  reason: string | null;
}

// Plain statistical comparison against a customer's own historical average
// invoice amount — not an AI guess. Needs at least one prior invoice to
// compare against; a customer's first invoice is never flagged since
// there's nothing real to compare it to yet.
export function flagAnomaly(newAmountCents: number, historicalAmountsCents: number[]): AnomalyResult {
  if (historicalAmountsCents.length === 0) return { flag: false, reason: null };

  const mean = historicalAmountsCents.reduce((a, b) => a + b, 0) / historicalAmountsCents.length;
  if (mean <= 0) return { flag: false, reason: null };

  const ratio = newAmountCents / mean;
  if (ratio >= 2.5) {
    return { flag: true, reason: `${ratio.toFixed(1)}x this customer's historical average invoice amount (${formatMoney(mean)}).` };
  }
  if (ratio <= 0.4) {
    return { flag: true, reason: `Only ${Math.round(ratio * 100)}% of this customer's historical average invoice amount (${formatMoney(mean)}) — unusually small.` };
  }
  return { flag: false, reason: null };
}
