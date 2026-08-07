import { REPLY_CLASSIFICATIONS } from "@/lib/enums";
import { REPLY_CLASSIFICATION_SYSTEM_PROMPT, type ReplyClassificationInput, type ReplyClassificationProvider, type ReplyClassificationResult } from "./types";
import { formatReplyPrompt } from "./format";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [2000, 8000, 20000];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    classification: { type: "STRING", enum: [...REPLY_CLASSIFICATIONS] },
    dispute_description: { type: "STRING", nullable: true },
    promised_date: { type: "STRING", nullable: true },
    promised_amount_cents: { type: "INTEGER", nullable: true },
  },
  required: ["classification", "dispute_description", "promised_date", "promised_amount_cents"],
};

interface RawResult {
  classification: ReplyClassificationResult["classification"];
  dispute_description: string | null;
  promised_date: string | null;
  promised_amount_cents: number | null;
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export function createGeminiReplyProvider(apiKey: string): ReplyClassificationProvider {
  return {
    name: "gemini",
    async classify(input: ReplyClassificationInput): Promise<ReplyClassificationResult> {
      const body = JSON.stringify({
        systemInstruction: { parts: [{ text: REPLY_CLASSIFICATION_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: formatReplyPrompt(input) }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA },
      });

      let lastError: Error = new Error("unreachable");
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        const res = await fetch(`${BASE_URL}/models/${MODEL}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.ok) {
          const data = (await res.json()) as GenerateContentResponse;
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Gemini returned no content.");
          const raw = JSON.parse(text) as RawResult;
          return {
            classification: raw.classification,
            disputeDescription: raw.dispute_description,
            promisedDateISO: raw.promised_date,
            promisedAmountCents: raw.promised_amount_cents,
          };
        }
        lastError = new Error(`Gemini generateContent failed: ${res.status} ${await res.text()}`);
        if (!RETRYABLE_STATUS.has(res.status) || attempt === RETRY_DELAYS_MS.length) throw lastError;
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      throw lastError;
    },
  };
}
