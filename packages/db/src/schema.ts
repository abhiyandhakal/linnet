import { relations, sql } from "drizzle-orm";
import {
  boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar
} from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();
const audit = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  version: integer("version").default(1).notNull()
};

export const user = pgTable("user", {
  id: text("id").primaryKey(), name: text("name").notNull(), email: varchar("email", { length: 320 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(), image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => [uniqueIndex("user_email_unique").on(table.email)]);
export const session = pgTable("session", {
  id: text("id").primaryKey(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), token: text("token").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  ipAddress: text("ip_address"), userAgent: text("user_agent"), userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
}, (table) => [uniqueIndex("session_token_unique").on(table.token)]);
export const account = pgTable("account", {
  id: text("id").primaryKey(), accountId: text("account_id").notNull(), providerId: text("provider_id").notNull(), userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"), refreshToken: text("refresh_token"), idToken: text("id_token"), accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }), refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }), scope: text("scope"), password: text("password"), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const verification = pgTable("verification", {
  id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const goalStatus = pgEnum("goal_status", ["active", "paused", "completed", "abandoned"]);
export const planStatus = pgEnum("plan_status", ["draft", "active", "superseded"]);
export const actionStatus = pgEnum("action_status", ["ready", "scheduled", "blocked", "done", "cancelled"]);
export const proposalStatus = pgEnum("proposal_status", ["pending", "applied", "rejected", "failed"]);
export const jobStatus = pgEnum("job_status", ["queued", "running", "succeeded", "failed", "cancelled"]);

// Better Auth's adapter creates its own auth tables; this table stores Linnet-specific profile state.
export const betaInvitations = pgTable("beta_invitations", {
  id: id(), email: varchar("email", { length: 320 }).notNull(), invitedBy: text("invited_by"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }), expiresAt: timestamp("expires_at", { withTimezone: true }), ...audit
}, (table) => [uniqueIndex("beta_invitation_email_unique").on(table.email)]);

export const goals = pgTable("goals", {
  id: id(), userId: text("user_id").notNull(), title: text("title").notNull(), description: text("description"),
  why: text("why"), status: goalStatus("status").default("active").notNull(), targetDate: timestamp("target_date", { withTimezone: true }), ...audit
}, (table) => [index("goals_user_status_idx").on(table.userId, table.status)]);

export const plans = pgTable("plans", {
  id: id(), goalId: uuid("goal_id").notNull().references(() => goals.id, { onDelete: "cascade" }),
  revision: integer("revision").notNull(), summary: text("summary").notNull(), status: planStatus("status").default("draft").notNull(),
  assumptions: jsonb("assumptions").$type<string[]>().default([]).notNull(), ...audit
}, (table) => [uniqueIndex("plans_goal_revision_unique").on(table.goalId, table.revision)]);

export const milestones = pgTable("milestones", {
  id: id(), planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }), title: text("title").notNull(),
  description: text("description"), position: integer("position").notNull(), completedAt: timestamp("completed_at", { withTimezone: true }), ...audit
});

export const actions = pgTable("actions", {
  id: id(), userId: text("user_id").notNull(), planId: uuid("plan_id").notNull().references(() => plans.id, { onDelete: "cascade" }),
  milestoneId: uuid("milestone_id").references(() => milestones.id, { onDelete: "set null" }), title: text("title").notNull(),
  status: actionStatus("status").default("ready").notNull(), rationale: text("rationale"), estimatedMinutes: integer("estimated_minutes"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }), dueAt: timestamp("due_at", { withTimezone: true }), ...audit
}, (table) => [index("actions_user_status_idx").on(table.userId, table.status)]);

export const dependencies = pgTable("dependencies", {
  id: id(), actionId: uuid("action_id").notNull().references(() => actions.id, { onDelete: "cascade" }),
  dependsOnActionId: uuid("depends_on_action_id").notNull().references(() => actions.id, { onDelete: "cascade" }), ...audit
}, (table) => [uniqueIndex("action_dependency_unique").on(table.actionId, table.dependsOnActionId)]);

export const updates = pgTable("updates", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  body: text("body").notNull(), source: varchar("source", { length: 32 }).default("inbox").notNull(), ...audit
});
export const decisions = pgTable("decisions", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  title: text("title").notNull(), rationale: text("rationale"), decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(), ...audit
});
export const contextItems = pgTable("context_items", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  kind: varchar("kind", { length: 32 }).notNull(), title: text("title").notNull(), content: text("content"), url: text("url"), isDeleted: boolean("is_deleted").default(false).notNull(), ...audit
});

export const inboxItems = pgTable("inbox_items", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  body: text("body").notNull(), clientMutationId: uuid("client_mutation_id"), status: varchar("status", { length: 24 }).default("queued").notNull(), ...audit
}, (table) => [uniqueIndex("inbox_idempotency_unique").on(table.userId, table.clientMutationId)]);

export const aiRuns = pgTable("ai_runs", {
  id: id(), userId: text("user_id").notNull(), provider: varchar("provider", { length: 40 }).notNull(), model: varchar("model", { length: 120 }).notNull(),
  promptVersion: varchar("prompt_version", { length: 40 }).notNull(), status: varchar("status", { length: 24 }).notNull(), input: jsonb("input"), output: jsonb("output"), ...audit
});
export const proposals = pgTable("ai_proposals", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  sourceInboxId: uuid("source_inbox_id").references(() => inboxItems.id, { onDelete: "set null" }), status: proposalStatus("status").default("pending").notNull(),
  rationale: text("rationale").notNull(), requiresConfirmation: boolean("requires_confirmation").default(false).notNull(), ...audit
});
export const proposalOperations = pgTable("proposal_operations", {
  id: id(), proposalId: uuid("proposal_id").notNull().references(() => proposals.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }).notNull(), payload: jsonb("payload").notNull(), position: integer("position").notNull(), ...audit
});
export const activityEvents = pgTable("activity_events", {
  id: id(), userId: text("user_id").notNull(), goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
  type: varchar("type", { length: 80 }).notNull(), entityType: varchar("entity_type", { length: 64 }).notNull(), entityId: text("entity_id").notNull(),
  payload: jsonb("payload").notNull(), undoPayload: jsonb("undo_payload"), ...audit
}, (table) => [index("activity_user_created_idx").on(table.userId, table.createdAt)]);

export const calendarConnections = pgTable("calendar_connections", {
  id: id(), userId: text("user_id").notNull(), provider: varchar("provider", { length: 32 }).default("google").notNull(),
  calendarId: text("calendar_id"), encryptedRefreshToken: text("encrypted_refresh_token"), syncToken: text("sync_token"), ...audit
}, (table) => [uniqueIndex("calendar_connection_user_provider_unique").on(table.userId, table.provider)]);
export const calendarOauthStates = pgTable("calendar_oauth_states", {
  id: id(), userId: text("user_id").notNull(), state: varchar("state", { length: 128 }).notNull(), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), ...audit
}, (table) => [uniqueIndex("calendar_oauth_state_unique").on(table.state)]);
export const calendarEvents = pgTable("calendar_events", {
  id: id(), userId: text("user_id").notNull(), connectionId: uuid("connection_id").notNull().references(() => calendarConnections.id, { onDelete: "cascade" }),
  actionId: uuid("action_id").references(() => actions.id, { onDelete: "set null" }), providerEventId: text("provider_event_id").notNull(), ownedByLinnet: boolean("owned_by_linnet").default(true).notNull(), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), endsAt: timestamp("ends_at", { withTimezone: true }).notNull(), ...audit
}, (table) => [uniqueIndex("calendar_provider_event_unique").on(table.connectionId, table.providerEventId)]);
export const notificationDevices = pgTable("notification_devices", {
  id: id(), userId: text("user_id").notNull(), platform: varchar("platform", { length: 24 }).notNull(), token: text("token").notNull(), ...audit
}, (table) => [uniqueIndex("notification_token_unique").on(table.token)]);
export const notifications = pgTable("notifications", {
  id: id(), userId: text("user_id").notNull(), title: text("title").notNull(), body: text("body").notNull(), type: varchar("type", { length: 40 }).notNull(), readAt: timestamp("read_at", { withTimezone: true }), ...audit
});
export const jobs = pgTable("jobs", {
  id: id(), userId: text("user_id"), type: varchar("type", { length: 64 }).notNull(), payload: jsonb("payload").notNull(),
  status: jobStatus("status").default("queued").notNull(), idempotencyKey: varchar("idempotency_key", { length: 160 }).notNull(),
  attempts: integer("attempts").default(0).notNull(), maxAttempts: integer("max_attempts").default(5).notNull(), availableAt: timestamp("available_at", { withTimezone: true }).defaultNow().notNull(), leasedUntil: timestamp("leased_until", { withTimezone: true }), lastError: text("last_error"), ...audit
}, (table) => [uniqueIndex("jobs_idempotency_unique").on(table.idempotencyKey), index("jobs_claim_idx").on(table.status, table.availableAt)]);
export const jobAttempts = pgTable("job_attempts", {
  id: id(), jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }), startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(), finishedAt: timestamp("finished_at", { withTimezone: true }), error: text("error"), ...audit
});

export const goalsRelations = relations(goals, ({ many }) => ({ plans: many(plans) }));
export const plansRelations = relations(plans, ({ one, many }) => ({ goal: one(goals, { fields: [plans.goalId], references: [goals.id] }), milestones: many(milestones), actions: many(actions) }));
