import { and, desc, eq, sql } from "drizzle-orm";
import { createDb, activityEvents, actions, decisions, goals, inboxItems, jobs, milestones, plans, proposalOperations, proposals, updates } from "@linnet/db";
import { assessRisk, evaluateSecretaryPolicy, type ProposedOperation } from "@linnet/domain";
import { publishJob } from "./queue";

export type Db = ReturnType<typeof createDb>;

export async function ensureInvite(db: Db, email: string) {
  const { betaInvitations } = await import("@linnet/db");
  const invitation = await db.query.betaInvitations.findFirst({ where: eq(betaInvitations.email, email) });
  return Boolean(invitation && (!invitation.expiresAt || invitation.expiresAt > new Date()));
}

export async function listGoals(db: Db, userId: string) {
  const rows = await db.select().from(goals).where(and(eq(goals.userId, userId), eq(goals.status, "active"))).orderBy(desc(goals.updatedAt));
  return Promise.all(rows.map(async (goal) => {
    const activePlan = await db.query.plans.findFirst({ where: and(eq(plans.goalId, goal.id), eq(plans.status, "active")) });
    const planActions = activePlan ? await db.select().from(actions).where(eq(actions.planId, activePlan.id)) : [];
    const blocked = planActions.filter((action) => action.status === "blocked").length;
    const incomplete = planActions.filter((action) => !["done", "cancelled"].includes(action.status)).length;
    return { ...goal, plan: activePlan, risk: assessRisk({ targetDate: goal.targetDate, incompleteMilestones: incomplete, blockedActions: blocked }) };
  }));
}

export async function getGoal(db: Db, userId: string, goalId: string) {
  const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!goal) return null;
  const plan = await db.query.plans.findFirst({ where: and(eq(plans.goalId, goal.id), eq(plans.status, "active")) });
  const planMilestones = plan ? await db.select().from(milestones).where(eq(milestones.planId, plan.id)).orderBy(milestones.position) : [];
  const planActions = plan ? await db.select().from(actions).where(eq(actions.planId, plan.id)).orderBy(actions.scheduledFor) : [];
  const goalUpdates = await db.select().from(updates).where(and(eq(updates.goalId, goal.id), eq(updates.userId, userId))).orderBy(desc(updates.createdAt)).limit(40);
  const goalDecisions = await db.select().from(decisions).where(and(eq(decisions.goalId, goal.id), eq(decisions.userId, userId))).orderBy(desc(decisions.decidedAt)).limit(40);
  const history = await db.select().from(activityEvents).where(and(eq(activityEvents.goalId, goal.id), eq(activityEvents.userId, userId))).orderBy(desc(activityEvents.createdAt)).limit(80);
  const risk = assessRisk({ targetDate: goal.targetDate, incompleteMilestones: planActions.filter((action) => !["done", "cancelled"].includes(action.status)).length, blockedActions: planActions.filter((action) => action.status === "blocked").length });
  return { ...goal, plan, milestones: planMilestones, actions: planActions, updates: goalUpdates, decisions: goalDecisions, history, risk };
}

export async function createGoal(db: Db, userId: string, input: { title: string; description?: string; why?: string; targetDate?: Date }) {
  const [goal] = await db.insert(goals).values({ userId, ...input }).returning();
  await db.insert(activityEvents).values({ userId, goalId: goal.id, type: "goal.created", entityType: "goal", entityId: goal.id, payload: { title: goal.title } });
  return goal;
}

export async function createPlanRevision(db: Db, userId: string, goalId: string, input: { summary: string; assumptions?: string[]; milestones: Array<{ title: string; description?: string }> }) {
  const goal = await db.query.goals.findFirst({ where: and(eq(goals.id, goalId), eq(goals.userId, userId)) });
  if (!goal) return null;
  return db.transaction(async (tx) => {
    const existing = await tx.select({ revision: plans.revision }).from(plans).where(eq(plans.goalId, goalId)).orderBy(desc(plans.revision)).limit(1);
    await tx.update(plans).set({ status: "superseded", updatedAt: new Date() }).where(and(eq(plans.goalId, goalId), eq(plans.status, "active")));
    const [plan] = await tx.insert(plans).values({ goalId, revision: (existing[0]?.revision ?? 0) + 1, summary: input.summary, assumptions: input.assumptions ?? [], status: "active" }).returning();
    if (input.milestones.length) await tx.insert(milestones).values(input.milestones.map((milestone, position) => ({ planId: plan.id, ...milestone, position })));
    await tx.insert(activityEvents).values({ userId, goalId, type: "plan.activated", entityType: "plan", entityId: plan.id, payload: { revision: plan.revision }, undoPayload: { previousPlan: existing[0]?.revision } });
    return plan;
  });
}

export async function enqueue(db: Db, input: { userId?: string; type: string; payload: Record<string, unknown>; idempotencyKey: string }) {
  const [job] = await db.insert(jobs).values(input).onConflictDoNothing().returning();
  if (job) return job;
  return db.query.jobs.findFirst({ where: eq(jobs.idempotencyKey, input.idempotencyKey) });
}

export async function captureInbox(db: Db, userId: string, input: { body: string; goalId?: string; clientMutationId?: string }) {
  const existing = input.clientMutationId ? await db.query.inboxItems.findFirst({ where: and(eq(inboxItems.userId, userId), eq(inboxItems.clientMutationId, input.clientMutationId)) }) : null;
  if (existing) return { inbox: existing, job: await db.query.jobs.findFirst({ where: eq(jobs.idempotencyKey, `capture:${existing.id}`) }) };
  const [inbox] = await db.insert(inboxItems).values({ userId, body: input.body, goalId: input.goalId, clientMutationId: input.clientMutationId }).returning();
  const job = await enqueue(db, { userId, type: "interpret_capture", payload: { inboxId: inbox.id }, idempotencyKey: `capture:${inbox.id}` });
  if (job) await publishJob(job);
  return { inbox, job };
}

export async function listInbox(db: Db, userId: string) {
  return db.select().from(inboxItems).where(eq(inboxItems.userId, userId)).orderBy(desc(inboxItems.createdAt)).limit(100);
}

export async function listProposals(db: Db, userId: string) {
  const rows = await db.select().from(proposals).where(eq(proposals.userId, userId)).orderBy(desc(proposals.createdAt)).limit(100);
  return Promise.all(rows.map(async (proposal) => ({ ...proposal, operations: await db.select().from(proposalOperations).where(eq(proposalOperations.proposalId, proposal.id)).orderBy(proposalOperations.position) })));
}

export async function applyProposal(db: Db, userId: string, proposalId: string, options: { allowProtected?: boolean } = {}) {
  const proposal = await db.query.proposals.findFirst({ where: and(eq(proposals.id, proposalId), eq(proposals.userId, userId)) });
  if (!proposal || proposal.status !== "pending") return null;
  const operations = await db.select().from(proposalOperations).where(eq(proposalOperations.proposalId, proposalId)).orderBy(proposalOperations.position);
  const evaluated = operations.map((operation) => evaluateSecretaryPolicy({ kind: operation.kind as ProposedOperation["kind"], payload: operation.payload as Record<string, unknown>, rationale: proposal.rationale }));
  if (evaluated.some((result) => !result.allowed || (result.confirmationRequired && !options.allowProtected))) return { proposal, applied: false, reason: "Confirmation is required for this proposal." };
  await db.transaction(async (tx) => {
    const undoPayload: { goalIds: string[]; actionIds: string[] } = { goalIds: [], actionIds: [] };
    for (const operation of operations) {
      if (operation.kind === "record_decision") {
        await tx.insert(decisions).values({ userId, goalId: proposal.goalId, title: String((operation.payload as { title?: string }).title ?? "Decision"), rationale: proposal.rationale });
      }
      if (operation.kind === "record_update") await tx.insert(updates).values({ userId, goalId: proposal.goalId, body: String((operation.payload as { body?: string }).body ?? proposal.rationale), source: "secretary" });
      if (operation.kind === "create_action" && proposal.goalId) {
        const activePlan = await tx.query.plans.findFirst({ where: and(eq(plans.goalId, proposal.goalId), eq(plans.status, "active")) });
        if (activePlan) {
          const [action] = await tx.insert(actions).values({ userId, planId: activePlan.id, title: String((operation.payload as { title?: string }).title ?? "New action"), rationale: proposal.rationale }).returning();
          undoPayload.actionIds.push(action.id);
        }
      }
      const targetId = (operation.payload as { _targetId?: string })._targetId;
      if ((operation.kind === "complete_action" || operation.kind === "block_action") && targetId) {
        await tx.update(actions).set({ status: operation.kind === "complete_action" ? "done" : "blocked", updatedAt: new Date(), version: sql`${actions.version} + 1` }).where(and(eq(actions.id, targetId), eq(actions.userId, userId)));
      }
      if (operation.kind === "create_goal_with_plan") {
        const payload = operation.payload as { title?: string; why?: string; description?: string; targetDate?: string; summary?: string; milestones?: Array<{ title?: string; description?: string }> };
        const [goal] = await tx.insert(goals).values({ userId, title: payload.title ?? "Untitled goal", why: payload.why, description: payload.description, targetDate: payload.targetDate ? new Date(payload.targetDate) : undefined }).returning();
        undoPayload.goalIds.push(goal.id);
        const [plan] = await tx.insert(plans).values({ goalId: goal.id, revision: 1, summary: payload.summary ?? `First plan for ${goal.title}`, status: "active" }).returning();
        const plannedMilestones = (payload.milestones ?? []).filter((milestone) => milestone.title);
        if (plannedMilestones.length) await tx.insert(milestones).values(plannedMilestones.map((milestone, position) => ({ planId: plan.id, title: milestone.title!, description: milestone.description, position })));
        await tx.insert(activityEvents).values({ userId, goalId: goal.id, type: "goal.created", entityType: "goal", entityId: goal.id, payload: { title: goal.title, source: "secretary" } });
      }
      if (operation.kind === "revise_plan" && proposal.goalId) {
        const payload = operation.payload as { summary?: string; assumptions?: string[]; milestones?: Array<{ title: string; description?: string }> };
        const revisions = await tx.select({ revision: plans.revision }).from(plans).where(eq(plans.goalId, proposal.goalId)).orderBy(desc(plans.revision)).limit(1);
        await tx.update(plans).set({ status: "superseded", updatedAt: new Date() }).where(and(eq(plans.goalId, proposal.goalId), eq(plans.status, "active")));
        const [plan] = await tx.insert(plans).values({ goalId: proposal.goalId, revision: (revisions[0]?.revision ?? 0) + 1, summary: payload.summary ?? proposal.rationale, assumptions: payload.assumptions ?? [], status: "active" }).returning();
        if (payload.milestones?.length) await tx.insert(milestones).values(payload.milestones.map((milestone, position) => ({ planId: plan.id, title: milestone.title, description: milestone.description, position })));
      }
    }
    await tx.update(proposals).set({ status: "applied", updatedAt: new Date(), version: sql`${proposals.version} + 1` }).where(eq(proposals.id, proposalId));
    await tx.insert(activityEvents).values({ userId, goalId: proposal.goalId, type: "proposal.applied", entityType: "proposal", entityId: proposalId, payload: { operationCount: operations.length }, undoPayload });
  });
  return { proposal, applied: true };
}

export async function undoProposal(db: Db, userId: string, proposalId: string) {
  const event = await db.query.activityEvents.findFirst({ where: and(eq(activityEvents.userId, userId), eq(activityEvents.entityId, proposalId), eq(activityEvents.type, "proposal.applied")) });
  if (!event) return null;
  const undo = (event.undoPayload ?? {}) as { goalIds?: string[]; actionIds?: string[] };
  await db.transaction(async (tx) => {
    if (undo.actionIds?.length) await tx.update(actions).set({ status: "cancelled", updatedAt: new Date(), version: sql`${actions.version} + 1` }).where(and(eq(actions.userId, userId), sql`${actions.id} = any(${undo.actionIds})`));
    if (undo.goalIds?.length) await tx.update(goals).set({ status: "abandoned", updatedAt: new Date(), version: sql`${goals.version} + 1` }).where(and(eq(goals.userId, userId), sql`${goals.id} = any(${undo.goalIds})`));
    await tx.insert(activityEvents).values({ userId, goalId: event.goalId, type: "proposal.undone", entityType: "proposal", entityId: proposalId, payload: { revertedEventId: event.id } });
  });
  return { undone: true };
}
