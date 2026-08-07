export interface RiskFactorResult {
  label: string;
  points: number;
}

export interface RiskScoreInput {
  overdueInvoiceCount: number;
  openDisputeCount: number;
  brokenPromiseCount: number;
  maxDaysOverdue: number;
}

export interface RiskScoreResult {
  score: number; // 0-100, higher = riskier
  label: "low" | "medium" | "high";
  factors: RiskFactorResult[];
}

// Deterministic, in plain code — same reasoning as sales-call-intelligence's
// computeRisk: an "account-risk score" the brief names has to be
// reproducible and auditable, not an AI guess a manager can't check.
export function computeCustomerRisk(input: RiskScoreInput): RiskScoreResult {
  const factors: RiskFactorResult[] = [];

  const disputePoints = Math.min(input.openDisputeCount * 20, 40);
  if (input.openDisputeCount > 0) {
    factors.push({ label: `${input.openDisputeCount} open dispute${input.openDisputeCount === 1 ? "" : "s"}`, points: disputePoints });
  }

  const brokenPoints = Math.min(input.brokenPromiseCount * 20, 40);
  if (input.brokenPromiseCount > 0) {
    factors.push({ label: `${input.brokenPromiseCount} broken payment promise${input.brokenPromiseCount === 1 ? "" : "s"}`, points: brokenPoints });
  }

  const overduePoints = Math.min(input.overdueInvoiceCount * 10, 30);
  if (input.overdueInvoiceCount > 0) {
    factors.push({ label: `${input.overdueInvoiceCount} overdue invoice${input.overdueInvoiceCount === 1 ? "" : "s"}`, points: overduePoints });
  }

  // Weighted so a single severely overdue invoice, even with nothing else
  // wrong on the account, is enough on its own to cross into "medium" —
  // verified live against a real 65-day-overdue invoice that otherwise
  // landed at a misleadingly low 25/100 with the original weights.
  if (input.maxDaysOverdue > 60) {
    factors.push({ label: `Oldest overdue invoice is ${input.maxDaysOverdue} days past due`, points: 20 });
  } else if (input.maxDaysOverdue > 30) {
    factors.push({ label: `Oldest overdue invoice is ${input.maxDaysOverdue} days past due`, points: 15 });
  }

  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  const label = score >= 60 ? "high" : score >= 30 ? "medium" : "low";
  return { score, label, factors };
}
