import { pgTable, text, timestamp, uuid, jsonb, vector } from "drizzle-orm/pg-core";
import { users } from "./users";

export const tasks = pgTable("task", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("dueDate", { mode: "date" }),
  priority: text("priority", { enum: ["low", "medium", "high"] }),
  status: text("status", { enum: ["todo", "in_progress", "done", "cancelled"] }).default("todo"),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const events = pgTable("event", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("startTime", { mode: "date" }).notNull(),
  endTime: timestamp("endTime", { mode: "date" }).notNull(),
  location: text("location"),
  attendees: text("attendees").array().default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const notes = pgTable("note", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().default([]),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow(),
});

export const embeddings = pgTable("embedding", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entityType: text("entityType", { enum: ["task", "event", "note"] }).notNull(),
  entityId: uuid("entityId").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 768 }), // Gemini text-embedding-004
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow(),
});
