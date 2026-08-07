import Anthropic from "@anthropic-ai/sdk";
import { REMINDER_SYSTEM_PROMPT, type ReminderDraftInput, type ReminderDraftProvider, type ReminderDraftResult } from "./types";
import { formatReminderPrompt } from "./format";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

const TOOL: Anthropic.Tool = {
  name: "submit_reminder_draft",
  description: "Submit the reminder email draft.",
  input_schema: {
    type: "object",
    properties: { subject: { type: "string" }, body: { type: "string" } },
    required: ["subject", "body"],
  } as unknown as Anthropic.Tool.InputSchema,
};

export function createAnthropicReminderProvider(apiKey: string): ReminderDraftProvider {
  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    async draft(input: ReminderDraftInput): Promise<ReminderDraftResult> {
      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: REMINDER_SYSTEM_PROMPT,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "submit_reminder_draft" },
        messages: [{ role: "user", content: formatReminderPrompt(input) }],
      });

      const toolUse = message.content.find((b) => b.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return a submit_reminder_draft tool call.");
      return toolUse.input as ReminderDraftResult;
    },
  };
}
