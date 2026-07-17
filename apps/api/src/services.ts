import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { createDb, activityEvents, actions, goals, inboxItems, jobs, milestones, plans, proposals, proposalOperations } from "@linnet/db";
import { assessRisk, evaluateSecretaryPolicy, type ProposedOperation } from "@linnet/domain";

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
  return { ...goal, plan, milestones: planMilestones, actions: planActions };
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
  return { inbox, job };
}

export async function applyProposal(db: Db, userId: string, proposalId: string) {
  const proposal = await db.query.proposals.findFirst({ where: and(eq(proposals.id, proposalId), eq(proposals.userId, userId)) });
  if (!proposal || proposal.status !== "pending") return null;
  const operations = await db.select().from(proposalOperations).where(eq(proposalOperations.proposalId, proposalId)).orderBy(proposalOperations.position);
  const evaluated = operations.map((operation) => evaluateSecretaryPolicy({ kind: operation.kind as ProposedOperation["kind"], payload: operation.payload as Record<string, unknown>, rationale: proposal.rationale }));
  if (evaluated.some((result) => !result.allowed || result.confirmationRequired)) return { proposal, applied: false, reason: "Confirmation is required for this proposal." };
  await db.transaction(async (tx) => {
    for (const operation of operations) {
      if (operation.kind === "record_decision") {
        const { decisions } = await import("@linnet/db");
        await tx.insert(decisions).values({ userId, goalId: proposal.goalId, title: String((operation.payload as { title?: string }).title ?? "Decision"), rationale: proposal.rationale });
      }
      if (operation.kind === "create_action" && proposal.goalId) {
        const activePlan = await tx.query.plans.findFirst({ where: and(eq(plans.goalId, proposal.goalId), eq(plans.status, "active")) });
        if (activePlan) await tx.insert(actions).values({ userId, planId: activePlan.id, title: String((operation.payload as { title?: string }).title ?? "New action"), rationale: proposal.rationale });
      }
    }
    await tx.update(proposals).set({ status: "applied", updatedAt: new Date(), version: sql`${proposals.version} + 1` }).where(eq(proposals.id, proposalId));
    await tx.insert(activityEvents).values({ userId, goalId: proposal.goalId, type: "proposal.applied", entityType: "proposal", entityId: proposalId, payload: { operationCount: operations.length } });
  });
  return { proposal, applied: true };
}
