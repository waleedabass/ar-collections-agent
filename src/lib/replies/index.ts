import type { ReplyClassificationProvider } from "./types";
import { createAnthropicReplyProvider } from "./anthropic";
import { createGeminiReplyProvider } from "./gemini";
import { createOpenRouterReplyProvider } from "./openrouter";

export function getReplyClassificationProvider(): ReplyClassificationProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): ReplyClassificationProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicReplyProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): ReplyClassificationProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiReplyProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): ReplyClassificationProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterReplyProvider(process.env.OPENROUTER_API_KEY);
}

export type { ReplyClassificationProvider, ReplyClassificationInput, ReplyClassificationResult } from "./types";
