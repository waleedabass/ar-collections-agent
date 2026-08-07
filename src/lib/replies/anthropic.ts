import Anthropic from "@anthropic-ai/sdk";
import { REPLY_CLASSIFICATIONS } from "@/lib/enums";
import { REPLY_CLASSIFICATION_SYSTEM_PROMPT, type ReplyClassificationInput, type ReplyClassificationProvider, type ReplyClassificationResult } from "./types";
import { formatReplyPrompt } from "./format";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "submit_reply_classification",
  description: "Submit the reply classification.",
  input_schema: {
    type: "object",
    properties: {
      classification: { type: "string", enum: [...REPLY_CLASSIFICATIONS] },
      dispute_description: { type: ["string", "null"] },
      promised_date: { type: ["string", "null"] },
      promised_amount_cents: { type: ["integer", "null"] },
    },
    required: ["classification", "dispute_description", "promised_date", "promised_amount_cents"],
  } as unknown as Anthropic.Tool.InputSchema,
};

interface RawResult {
  classification: ReplyClassificationResult["classification"];
  dispute_description: string | null;
  promised_date: string | null;
  promised_amount_cents: number | null;
}

export function createAnthropicReplyProvider(apiKey: string): ReplyClassificationProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async classify(input: ReplyClassificationInput): Promise<ReplyClassificationResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: REPLY_CLASSIFICATION_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_reply_classification" },
        messages: [{ role: "user", content: formatReplyPrompt(input) }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a submit_reply_classification tool call.");
      const raw = toolUse.input as RawResult;
      return {
        classification: raw.classification,
        disputeDescription: raw.dispute_description,
        promisedDateISO: raw.promised_date,
        promisedAmountCents: raw.promised_amount_cents,
      };
    },
  };
}
