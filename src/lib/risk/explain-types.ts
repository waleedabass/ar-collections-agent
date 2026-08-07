import type { RiskFactorResult } from "./score";

export interface ExplainRiskInput {
  customerName: string;
  score: number;
  label: string;
  factors: RiskFactorResult[];
  openDisputeDescriptions: string[];
}

export interface RiskExplainProvider {
  name: string;
  explain(input: ExplainRiskInput): Promise<string>;
}

export const RISK_EXPLAIN_SYSTEM_PROMPT = `You write a one-paragraph explanation of a customer's AR risk score for a collections manager reviewing their portfolio.

The score and every factor are already computed in plain code and given to you — do not invent new factors, do not second-guess the number, and do not describe a dispute that isn't in the provided list. Reference the actual factors and evidence by name. Write like a colleague giving a fast, honest read of the account, not a generic report.`;
