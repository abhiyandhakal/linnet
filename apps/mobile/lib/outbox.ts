import * as SQLite from "expo-sqlite";
import { api } from "./api";

let initialized = false;
async function db() {
  const database = await SQLite.openDatabaseAsync("linnet.db");
  if (!initialized) {
    await database.execAsync("create table if not exists capture_outbox (id text primary key not null, body text not null, goal_id text, created_at text not null)");
    initialized = true;
  }
  return database;
}
export async function queueCapture(body: string, goalId?: string) {
  const id = crypto.randomUUID(); const database = await db();
  await database.runAsync("insert into capture_outbox (id, body, goal_id, created_at) values (?, ?, ?, ?)", id, body, goalId ?? null, new Date().toISOString());
  return id;
}
export async function flushOutbox() {
  const database = await db(); const rows = await database.getAllAsync<{ id: string; body: string; goal_id: string | null }>("select * from capture_outbox order by created_at");
  for (const row of rows) {
    const { error } = await api.api.v1.inbox.post({ body: row.body, goalId: row.goal_id ?? undefined, clientMutationId: row.id });
    if (error) break;
    await database.runAsync("delete from capture_outbox where id = ?", row.id);
  }
}
