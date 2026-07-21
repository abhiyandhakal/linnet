import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia, t } from "elysia";
import { and, eq, sql } from "drizzle-orm";
import { getConfig } from "@linnet/config";
import { activityEvents, actions, betaInvitations, calendarConnections, calendarEvents, calendarOauthStates, createDb, jobs, notificationDevices, notifications, proposals } from "@linnet/db";
import { auth } from "./auth";
import { encryptSecret, exchangeGoogleCode, googleConnectUrl, scheduleFocusBlock } from "./calendar";
import { applyProposal, captureInbox, createGoal, createPlanRevision, getGoal, listGoals, listInbox, listProposals, undoProposal } from "./services";

const config = getConfig();
const db = createDb(config.DATABASE_URL);
const error = (code: string, message: string, details?: unknown) => ({ code, message, details, requestId: crypto.randomUUID() });

async function principal(headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session?.user) return null;
  const invitation = await db.query.betaInvitations.findFirst({ where: eq(betaInvitations.email, session.user.email) });
  if (!invitation || (invitation.expiresAt && invitation.expiresAt < new Date())) return null;
  return session.user;
}

export const app = new Elysia()
  .use(cors({ origin: [config.WEB_ORIGIN], credentials: true, allowedHeaders: ["content-type", "idempotency-key", "cookie"] }))
  .use(openapi({ enabled: true, provider: config.NODE_ENV === "production" ? null : "scalar", documentation: { info: { title: "Linnet API", version: "v1" } } }))
  .mount(auth.handler)
  .get("/api/health", () => ({ status: "ok" }))
  .get("/api/ready", async () => { await db.execute(sql`select 1`); return { status: "ready" }; })
  .get("/api/v1/me", async ({ request, status }) => {
    const user = await principal(request.headers);
    return user ? { user } : status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
  })
  .derive(async ({ request }) => ({ getUser: () => principal(request.headers) }))
  .get("/api/v1/goals", async ({ getUser, status }) => { const user = await getUser(); return user ? listGoals(db, user.id) : status(401, error("UNAUTHORIZED", "An invited Linnet session is required.")); })
  .post("/api/v1/goals", async ({ getUser, body, set, status }) => { const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required.")); set.status = 201; return createGoal(db, user.id, { ...body, targetDate: body.targetDate ? new Date(body.targetDate) : undefined }); }, {
    body: t.Object({ title: t.String(), description: t.Optional(t.String()), why: t.Optional(t.String()), targetDate: t.Optional(t.String()) })
  })
  .get("/api/v1/goals/:id", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const goal = await getGoal(db, user.id, params.id); return goal ?? status(404, error("NOT_FOUND", "Goal not found."));
  }, { params: t.Object({ id: t.String() }) })
  .post("/api/v1/goals/:id/plans", async ({ getUser, params, body, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const plan = await createPlanRevision(db, user.id, params.id, body); return plan ?? status(404, error("NOT_FOUND", "Goal not found."));
  }, { params: t.Object({ id: t.String() }), body: t.Object({ summary: t.String(), assumptions: t.Optional(t.Array(t.String())), milestones: t.Array(t.Object({ title: t.String(), description: t.Optional(t.String()) })) }) })
  .post("/api/v1/inbox", async ({ getUser, body, set, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const result = await captureInbox(db, user.id, body); set.status = 202; return { ...result, status: "queued" };
  }, { body: t.Object({ body: t.String(), goalId: t.Optional(t.String()), clientMutationId: t.Optional(t.String()) }) })
  .get("/api/v1/inbox", async ({ getUser, status }) => {
    const user = await getUser(); return user ? listInbox(db, user.id) : status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
  })
  .get("/api/v1/jobs/:id", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const job = await db.query.jobs.findFirst({ where: and(eq(jobs.id, params.id), eq(jobs.userId, user.id)) }); return job ?? status(404, error("NOT_FOUND", "Job not found."));
  }, { params: t.Object({ id: t.String() }) })
  .post("/api/v1/proposals/:id/apply", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const result = await applyProposal(db, user.id, params.id); return result ?? status(404, error("NOT_FOUND", "Proposal not found."));
  }, { params: t.Object({ id: t.String() }) })
  .get("/api/v1/proposals", async ({ getUser, status }) => {
    const user = await getUser(); return user ? listProposals(db, user.id) : status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
  })
  .post("/api/v1/proposals/:id/confirm", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const result = await applyProposal(db, user.id, params.id, { allowProtected: true }); return result ?? status(404, error("NOT_FOUND", "Proposal not found."));
  }, { params: t.Object({ id: t.String() }) })
  .post("/api/v1/proposals/:id/reject", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const [proposal] = await db.update(proposals).set({ status: "rejected", updatedAt: new Date() }).where(and(eq(proposals.id, params.id), eq(proposals.userId, user.id))).returning();
    return proposal ?? status(404, error("NOT_FOUND", "Proposal not found."));
  }, { params: t.Object({ id: t.String() }) })
  .post("/api/v1/proposals/:id/undo", async ({ getUser, params, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const result = await undoProposal(db, user.id, params.id); return result ?? status(404, error("NOT_FOUND", "Undo is not available for this proposal."));
  }, { params: t.Object({ id: t.String() }) })
  .get("/api/v1/now", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const goalList = await listGoals(db, user.id);
    const primary = goalList.sort((a, b) => (a.risk === "at_risk" ? -1 : 0) - (b.risk === "at_risk" ? -1 : 0))[0];
    const detail = primary ? await getGoal(db, user.id, primary.id) : null;
    const nextAction = detail?.actions.find((action) => ["ready", "scheduled", "blocked"].includes(action.status));
    return { primaryGoal: primary, nextAction, attentionCount: goalList.filter((goal) => goal.risk !== "on_track").length };
  })
  .get("/api/v1/actions", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    return db.select().from(actions).where(eq(actions.userId, user.id)).orderBy(actions.scheduledFor);
  })
  .post("/api/v1/goals/:id/updates", async ({ getUser, params, body, set, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const goal = await getGoal(db, user.id, params.id); if (!goal) return status(404, error("NOT_FOUND", "Goal not found."));
    const result = await captureInbox(db, user.id, { body: body.body, goalId: params.id, clientMutationId: body.clientMutationId }); set.status = 202; return { ...result, status: "queued" };
  }, { params: t.Object({ id: t.String() }), body: t.Object({ body: t.String(), clientMutationId: t.Optional(t.String()) }) })
  .post("/api/v1/goals/:id/conversation", async ({ getUser, params, body, set, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const goal = await getGoal(db, user.id, params.id); if (!goal) return status(404, error("NOT_FOUND", "Goal not found."));
    const result = await captureInbox(db, user.id, { body: body.message, goalId: params.id, clientMutationId: body.clientMutationId }); set.status = 202; return { ...result, status: "queued" };
  }, { params: t.Object({ id: t.String() }), body: t.Object({ message: t.String(), clientMutationId: t.Optional(t.String()) }) })
  .post("/api/v1/assistant", async ({ getUser, body, set, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const result = await captureInbox(db, user.id, { body: body.message, goalId: body.goalId, clientMutationId: body.clientMutationId }); set.status = 202; return { ...result, status: "queued" };
  }, { body: t.Object({ message: t.String(), goalId: t.Optional(t.String()), clientMutationId: t.Optional(t.String()) }) })
  .get("/api/v1/activity", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    return db.select().from(activityEvents).where(eq(activityEvents.userId, user.id)).orderBy(activityEvents.createdAt).limit(100);
  })
  .get("/api/v1/notifications", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    return db.select().from(notifications).where(eq(notifications.userId, user.id)).orderBy(notifications.createdAt).limit(100);
  })
  .get("/api/v1/calendar", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const connections = await db.select().from(calendarConnections).where(eq(calendarConnections.userId, user.id));
    const events = await db.select().from(calendarEvents).where(eq(calendarEvents.userId, user.id)).orderBy(calendarEvents.startsAt);
    return { connected: connections.some((connection) => Boolean(connection.encryptedRefreshToken)), connections: connections.map(({ encryptedRefreshToken, ...connection }) => connection), events };
  })
  .post("/api/v1/calendar/google/connect", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const state = crypto.randomUUID();
    await db.insert(calendarOauthStates).values({ userId: user.id, state, expiresAt: new Date(Date.now() + 10 * 60_000) });
    try { return { url: googleConnectUrl(config, state) }; } catch (cause) { return status(503, error("INTEGRATION_UNAVAILABLE", cause instanceof Error ? cause.message : "Calendar OAuth is unavailable.")); }
  })
  .get("/api/v1/calendar/google/callback", async ({ query, status, set }) => {
    const state = await db.query.calendarOauthStates.findFirst({ where: eq(calendarOauthStates.state, query.state) });
    if (!state || state.expiresAt < new Date()) return status(400, error("INVALID_STATE", "This calendar connection request has expired."));
    try {
      const tokens = await exchangeGoogleCode(config, query.code);
      if (!tokens.refresh_token) return status(400, error("MISSING_REFRESH_TOKEN", "Google did not return a refresh token. Revoke access and retry consent."));
      await db.insert(calendarConnections).values({ userId: state.userId, provider: "google", calendarId: "primary", encryptedRefreshToken: encryptSecret(tokens.refresh_token, config) }).onConflictDoUpdate({ target: [calendarConnections.userId, calendarConnections.provider], set: { encryptedRefreshToken: encryptSecret(tokens.refresh_token, config), updatedAt: new Date() } });
      await db.delete(calendarOauthStates).where(eq(calendarOauthStates.id, state.id));
      set.headers.location = `${config.WEB_ORIGIN}/?calendar=connected`; return status(302);
    } catch (cause) { return status(502, error("GOOGLE_CALENDAR_FAILED", cause instanceof Error ? cause.message : "Google Calendar connection failed.")); }
  }, { query: t.Object({ code: t.String(), state: t.String() }) })
  .post("/api/v1/calendar/focus-blocks", async ({ getUser, body, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    try { return await scheduleFocusBlock(db, config, { userId: user.id, actionId: body.actionId, startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt) }); }
    catch (cause) { return status(422, error("SCHEDULE_FAILED", cause instanceof Error ? cause.message : "Focus block could not be scheduled.")); }
  }, { body: t.Object({ actionId: t.String(), startsAt: t.String(), endsAt: t.String() }) })
  .post("/api/v1/notifications/devices", async ({ getUser, body, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const [device] = await db.insert(notificationDevices).values({ userId: user.id, platform: body.platform, token: body.token }).onConflictDoUpdate({ target: notificationDevices.token, set: { userId: user.id, platform: body.platform, updatedAt: new Date() } }).returning();
    return { device };
  }, { body: t.Object({ token: t.String(), platform: t.Union([t.Literal("ios"), t.Literal("android")]) }) })
  .get("/api/v1/reviews/daily", async ({ getUser, status }) => {
    const user = await getUser(); if (!user) return status(401, error("UNAUTHORIZED", "An invited Linnet session is required."));
    const goalList = await listGoals(db, user.id);
    return { period: "daily", moving: goalList.filter((goal) => goal.risk === "on_track").map((goal) => goal.title), drifting: goalList.filter((goal) => goal.risk !== "on_track").map((goal) => goal.title), generatedAt: new Date() };
  });

export type App = typeof app;
