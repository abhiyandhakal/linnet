export type GoalStatus = "active" | "paused" | "completed" | "abandoned";
export type PlanStatus = "draft" | "active" | "superseded";
export type ActionStatus = "ready" | "scheduled" | "blocked" | "done" | "cancelled";

export type Risk = "on_track" | "watch" | "at_risk";

export function assessRisk(input: {
  targetDate?: Date | null;
  incompleteMilestones: number;
  blockedActions: number;
  now?: Date;
}): Risk {
  if (input.blockedActions > 0) return "at_risk";
  if (!input.targetDate || input.incompleteMilestones === 0) return "on_track";
  const days = (input.targetDate.getTime() - (input.now ?? new Date()).getTime()) / 86_400_000;
  return days < input.incompleteMilestones * 2 ? "watch" : "on_track";
}

export type OperationKind =
  | "create_goal_with_plan"
  | "create_action"
  | "complete_action"
  | "block_action"
  | "record_decision"
  | "record_update"
  | "revise_plan"
  | "schedule_action"
  | "delete_context"
  | "abandon_goal"
  | "external_calendar_change"
  | "send_external_message";

export type ProposedOperation = {
  kind: OperationKind;
  targetId?: string;
  payload: Record<string, unknown>;
  rationale: string;
};

export type PolicyResult = { allowed: boolean; confirmationRequired: boolean; reason?: string };

const protectedOperations = new Set<OperationKind>([
  "delete_context",
  "abandon_goal",
  "external_calendar_change",
  "send_external_message"
]);

export function evaluateSecretaryPolicy(operation: ProposedOperation): PolicyResult {
  if (protectedOperations.has(operation.kind)) {
    return { allowed: true, confirmationRequired: true, reason: "This operation is protected by Linnet's safety policy." };
  }
  if (!operation.rationale.trim()) return { allowed: false, confirmationRequired: true, reason: "A rationale is required." };
  return { allowed: true, confirmationRequired: false };
}
