import { and, eq, sql } from "drizzle-orm";
import { DeterministicProvider, GroqProvider, type ModelProvider } from "@linnet/ai";
import { getConfig } from "@linnet/config";
import { activityEvents, createDb, inboxItems, jobAttempts, jobs, proposalOperations, proposals } from "@linnet/db";
import { evaluateSecretaryPolicy } from "@linnet/domain";
import { applyProposal, getGoal } from "./services";

const config = getConfig();
const db = createDb(config.DATABASE_URL);
const provider: ModelProvider = config.AI_PROVIDER === "groq" && config.GROQ_API_KEY
  ? new GroqProvider(config.GROQ_API_KEY, config.GROQ_ROUTINE_MODEL, config.GROQ_REASONING_MODEL)
  : new DeterministicProvider();

export type LinnetJobMessage = { jobId: string; type: string };

function goalContext(goal: Awaited<ReturnType<typeof getGoal>>) {
  if (!goal) return "No goal was explicitly selected. If this message is not clearly a new goal, leave operations empty so Linnet can ask for clarification.";
  return JSON.stringify({
    goal: { id: goal.id, title: goal.title, why: goal.why, targetDate: goal.targetDate },
    plan: goal.plan ? { id: goal.plan.id, summary: goal.plan.summary, assumptions: goal.plan.assumptions } : null,
    milestones: goal.milestones.map(({ id, title, completedAt }) => ({ id, title, completedAt })),
    actions: goal.actions.map(({ id, title, status, dueAt }) => ({ id, title, status, dueAt })),
    decisions: goal.decisions.slice(0, 8).map(({ title, rationale }) => ({ title, rationale })),
    updates: goal.updates.slice(0, 8).map(({ body, createdAt }) => ({ body, createdAt }))
  });
}

export async function processJob(message: LinnetJobMessage) {
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, message.jobId) });
  if (!job || job.status === "succeeded" || job.status === "cancelled") return;
  const now = new Date();
  const claimed = await db.update(jobs).set({ status: "running", attempts: sql`${jobs.attempts} + 1`, leasedUntil: new Date(now.getTime() + 5 * 60_000), updatedAt: now }).where(and(eq(jobs.id, job.id), eq(jobs.status, "queued"))).returning();
  if (!claimed[0]) return;
  const [attempt] = await db.insert(jobAttempts).values({ jobId: job.id }).returning();
  try {
    if (job.type !== "interpret_capture") throw new Error(`Unsupported queue job: ${job.type}`);
    const inboxId = (job.payload as { inboxId?: string }).inboxId;
    if (!inboxId || !job.userId) throw new Error("Capture job is invalid.");
    const inbox = await db.query.inboxItems.findFirst({ where: and(eq(inboxItems.id, inboxId), eq(inboxItems.userId, job.userId)) });
    if (!inbox) throw new Error("Capture is missing.");
    const goal = inbox.goalId ? await getGoal(db, job.userId, inbox.goalId) : null;
    const needsReasoning = /\b(plan|strategy|milestone|deadline|risk|reconcile|why|dependency)\b/i.test(inbox.body);
    const interpretation = needsReasoning
      ? await provider.reason({ message: inbox.body, goalContext: goalContext(goal) })
      : await provider.interpret({ message: inbox.body, goalContext: goalContext(goal) });
    const evaluated = interpretation.operations.map((operation) => evaluateSecretaryPolicy(operation));
    const requiresConfirmation = evaluated.some((result) => result.confirmationRequired || !result.allowed);
    const [proposal] = await db.transaction(async (tx) => {
      const created = await tx.insert(proposals).values({ userId: job.userId!, goalId: inbox.goalId, sourceInboxId: inbox.id, rationale: interpretation.summary, requiresConfirmation }).returning();
      if (interpretation.operations.length) await tx.insert(proposalOperations).values(interpretation.operations.map((operation, position) => ({ proposalId: created[0].id, kind: operation.kind, payload: { ...operation.payload, _targetId: operation.targetId }, position })));
      await tx.update(inboxItems).set({ status: requiresConfirmation ? "needs_review" : "applied", updatedAt: new Date() }).where(eq(inboxItems.id, inbox.id));
      await tx.insert(activityEvents).values({ userId: job.userId!, goalId: inbox.goalId, type: "inbox.interpreted", entityType: "inbox_item", entityId: inbox.id, payload: { proposalId: created[0].id, requiresConfirmation, provider: provider.provider } });
      return created;
    });
    if (!requiresConfirmation) await applyProposal(db, job.userId, proposal.id);
    await db.update(jobs).set({ status: "succeeded", leasedUntil: null, updatedAt: new Date() }).where(eq(jobs.id, job.id));
    await db.update(jobAttempts).set({ finishedAt: new Date(), updatedAt: new Date() }).where(eq(jobAttempts.id, attempt.id));
  } catch (cause) {
    const messageText = cause instanceof Error ? cause.message : String(cause);
    await db.update(jobs).set({ status: "queued", leasedUntil: null, lastError: messageText, updatedAt: new Date() }).where(eq(jobs.id, job.id));
    await db.update(jobAttempts).set({ finishedAt: new Date(), error: messageText, updatedAt: new Date() }).where(eq(jobAttempts.id, attempt.id));
    throw cause;
  }
}
