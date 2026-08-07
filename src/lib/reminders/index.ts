import type { ReminderDraftProvider } from "./types";
import { createAnthropicReminderProvider } from "./anthropic";
import { createGeminiReminderProvider } from "./gemini";
import { createOpenRouterReminderProvider } from "./openrouter";

export function getReminderDraftProvider(): ReminderDraftProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();

  if (requested === "anthropic") return requireAnthropic();
  if (requested === "gemini") return requireGemini();
  if (requested === "openrouter") return requireOpenRouter();

  if (process.env.ANTHROPIC_API_KEY) return requireAnthropic();
  if (process.env.GEMINI_API_KEY) return requireGemini();
  if (process.env.OPENROUTER_API_KEY) return requireOpenRouter();

  throw new Error("No AI provider configured — set ANTHROPIC_API_KEY, GEMINI_API_KEY, or OPENROUTER_API_KEY.");
}

function requireAnthropic(): ReminderDraftProvider {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
  return createAnthropicReminderProvider(process.env.ANTHROPIC_API_KEY);
}
function requireGemini(): ReminderDraftProvider {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set.");
  return createGeminiReminderProvider(process.env.GEMINI_API_KEY);
}
function requireOpenRouter(): ReminderDraftProvider {
  if (!process.env.OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not set.");
  return createOpenRouterReminderProvider(process.env.OPENROUTER_API_KEY);
}

export { computeDunningSchedule } from "./schedule";
export type { ScheduledStep } from "./schedule";
export type { ReminderDraftProvider, ReminderDraftInput, ReminderDraftResult } from "./types";
