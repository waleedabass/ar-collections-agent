import type { ReminderStage } from "@/lib/enums";

export interface ScheduledStep {
  stage: ReminderStage;
  scheduledFor: Date;
}

const DAY = 24 * 60 * 60 * 1000;

// Deterministic dunning cadence, computed once from the invoice's real due
// date — not an AI scheduler. A friendly heads-up before the due date, then
// progressively firmer reminders at fixed overdue milestones.
export function computeDunningSchedule(dueDate: Date): ScheduledStep[] {
  return [
    { stage: "upcoming", scheduledFor: new Date(dueDate.getTime() - 3 * DAY) },
    { stage: "overdue_1", scheduledFor: new Date(dueDate.getTime() + 1 * DAY) },
    { stage: "overdue_2", scheduledFor: new Date(dueDate.getTime() + 7 * DAY) },
    { stage: "overdue_3", scheduledFor: new Date(dueDate.getTime() + 14 * DAY) },
    { stage: "final_notice", scheduledFor: new Date(dueDate.getTime() + 30 * DAY) },
  ];
}
