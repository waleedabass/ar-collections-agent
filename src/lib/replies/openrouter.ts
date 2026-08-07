import { REPLY_CLASSIFICATIONS } from "@/lib/enums";
import { REPLY_CLASSIFICATION_SYSTEM_PROMPT, type ReplyClassificationInput, type ReplyClassificationProvider, type ReplyClassificationResult } from "./types";
import { formatReplyPrompt } from "./format";

const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const TOOL = {
  type: "function" as const,
  function: {
    name: "submit_reply_classification",
    description: "Submit the reply classification.",
    parameters: {
      type: "object",
      properties: {
        classification: { type: "string", enum: [...REPLY_CLASSIFICATIONS] },
        dispute_description: { type: ["string", "null"] },
        promised_date: { type: ["string", "null"] },
        promised_amount_cents: { type: ["integer", "null"] },
      },
      required: ["classification", "dispute_description", "promised_date", "promised_amount_cents"],
    },
  },
};

interface RawResult {
  classification: ReplyClassificationResult["classification"];
  dispute_description: string | null;
  promised_date: string | null;
  promised_amount_cents: number | null;
}

interface ChatCompletionResponse {
  choices?: { message?: { tool_calls?: { function: { arguments: string } }[] } }[];
}

export function createOpenRouterReplyProvider(apiKey: string): ReplyClassificationProvider {
  return {
    name: "openrouter",
    async classify(input: ReplyClassificationInput): Promise<ReplyClassificationResult> {
      const body = JSON.stringify({
        model: MODEL,
        max_tokens: 1200,
        messages: [
          { role: "system", content: REPLY_CLASSIFICATION_SYSTEM_PROMPT },
          { role: "user", content: formatReplyPrompt(input) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "submit_reply_classification" } },
      });

      let lastError: Error = new Error("unreachable");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const res = await fetch(BASE_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://arcautomations.in",
            "X-Title": "ARC Automations AR Collections Agent",
          },
          body,
        });
        if (res.ok) {
          const data = (await res.json()) as ChatCompletionResponse;
          const call = data.choices?.[0]?.message?.tool_calls?.[0];
          if (!call) throw new Error("OpenRouter did not return a submit_reply_classification tool call.");
          const raw = JSON.parse(call.function.arguments) as RawResult;
          return {
            classification: raw.classification,
            disputeDescription: raw.dispute_description,
            promisedDateISO: raw.promised_date,
            promisedAmountCents: raw.promised_amount_cents,
          };
        }
        lastError = new Error(`OpenRouter chat completion failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
