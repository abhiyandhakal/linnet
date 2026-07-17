import { and, eq, lte, sql } from "drizzle-orm";
import { DeterministicProvider, GroqProvider, type ModelProvider } from "@linnet/ai";
import { getConfig } from "@linnet/config";
import { activityEvents, createDb, inboxItems, jobs, notificationDevices, notifications, proposals, proposalOperations } from "@linnet/db";
import { evaluateSecretaryPolicy } from "@linnet/domain";

const config = getConfig();
const db = createDb(config.DATABASE_URL);
const provider: ModelProvider = config.AI_PROVIDER === "groq" && config.GROQ_API_KEY
  ? new GroqProvider(config.GROQ_API_KEY, config.GROQ_ROUTINE_MODEL, config.GROQ_REASONING_MODEL)
  : new DeterministicProvider();

async function claimJob() {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + 60_000);
  const claimed = await db.execute(sql`
    update jobs
    set status = 'running', leased_until = ${leaseUntil}, attempts = attempts + 1, updated_at = ${now}
    where id = (
      select id from jobs
      where status = 'queued' and available_at <= ${now}
      order by available_at asc
      for update skip locked
      limit 1
    )
    returning *
  `);
  return claimed[0] as typeof jobs.$inferSelect | undefined;
}

async function interpretCapture(job: typeof jobs.$inferSelect) {
  const inboxId = (job.payload as { inboxId?: string }).inboxId;
  if (!inboxId || !job.userId) throw new Error("Capture job is invalid.");
  const inbox = await db.query.inboxItems.findFirst({ where: and(eq(inboxItems.id, inboxId), eq(inboxItems.userId, job.userId)) });
  if (!inbox) throw new Error("Inbox item is missing.");
  const requiresReasoning = /\b(plan|strategy|milestone|deadline|risk|reconcile|why|dependency)\b/i.test(inbox.body);
  const interpretation = requiresReasoning
    ? await provider.reason({ message: inbox.body })
    : await provider.interpret({ message: inbox.body });
  const evaluated = interpretation.operations.map((operation) => evaluateSecretaryPolicy(operation));
  const requiresConfirmation = evaluated.some((result) => result.confirmationRequired || !result.allowed);
  await db.transaction(async (tx) => {
    const [proposal] = await tx.insert(proposals).values({ userId: job.userId!, goalId: inbox.goalId, sourceInboxId: inbox.id, rationale: interpretation.summary, requiresConfirmation }).returning();
    if (interpretation.operations.length) await tx.insert(proposalOperations).values(interpretation.operations.map((operation, position) => ({ proposalId: proposal.id, kind: operation.kind, payload: operation.payload, position })));
    await tx.update(inboxItems).set({ status: "interpreted", updatedAt: new Date() }).where(eq(inboxItems.id, inbox.id));
    await tx.insert(activityEvents).values({ userId: job.userId!, goalId: inbox.goalId, type: "inbox.interpreted", entityType: "inbox_item", entityId: inbox.id, payload: { proposalId: proposal.id, requiresConfirmation } });
  });
}

async function deliverPush(job: typeof jobs.$inferSelect) {
  const notificationId = (job.payload as { notificationId?: string }).notificationId;
  if (!notificationId || !job.userId) throw new Error("Push job is invalid.");
  const notification = await db.query.notifications.findFirst({ where: eq(notifications.id, notificationId) });
  if (!notification || notification.userId !== job.userId) throw new Error("Notification is missing.");
  const devices = await db.select().from(notificationDevices).where(eq(notificationDevices.userId, job.userId));
  if (!devices.length) return;
  const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(devices.map((device) => ({ to: device.token, title: notification.title, body: notification.body, sound: "default", data: { notificationId: notification.id, type: notification.type } }))) });
  if (!response.ok) throw new Error(`Expo push delivery failed: ${response.status}`);
}

async function process(job: typeof jobs.$inferSelect) {
  if (job.type === "interpret_capture") return interpretCapture(job);
  // Other durable job types are intentionally no-ops until their integrations are connected.
  if (job.type === "push_notification") return deliverPush(job);
  if (["calendar_sync", "schedule_generation", "daily_brief", "weekly_brief", "retry_recovery"].includes(job.type)) return;
  throw new Error(`Unknown job type: ${job.type}`);
}

async function tick() {
  const job = await claimJob();
  if (!job) return;
  try {
    await process(job);
    await db.update(jobs).set({ status: "succeeded", leasedUntil: null, updatedAt: new Date() }).where(eq(jobs.id, job.id));
  } catch (cause) {
    const attempts = job.attempts;
    const retry = attempts < job.maxAttempts;
    const delayMs = Math.min(60_000 * 2 ** attempts, 3_600_000);
    await db.update(jobs).set({ status: retry ? "queued" : "failed", leasedUntil: null, availableAt: new Date(Date.now() + delayMs), lastError: cause instanceof Error ? cause.message : String(cause), updatedAt: new Date() }).where(eq(jobs.id, job.id));
  }
}

async function recoverExpiredLeases() {
  await db.update(jobs).set({ status: "queued", leasedUntil: null, updatedAt: new Date() }).where(and(eq(jobs.status, "running"), lte(jobs.leasedUntil, new Date())));
}

await recoverExpiredLeases();
setInterval(() => void tick(), 1_000);
console.log(`Linnet worker started with ${provider.provider}; routine=${provider.routineModel}; reasoning=${provider.reasoningModel}`);
