import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { actions, calendarConnections, calendarEvents, createDb } from "@linnet/db";
import type { AppConfig } from "@linnet/config";

type Db = ReturnType<typeof createDb>;
type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

function key(config: AppConfig) {
  if (!config.TOKEN_ENCRYPTION_KEY) throw new Error("TOKEN_ENCRYPTION_KEY is required for calendar connections.");
  const value = Buffer.from(config.TOKEN_ENCRYPTION_KEY, "base64");
  if (value.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  return value;
}

export function encryptSecret(value: string, config: AppConfig) {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(config), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]); const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(value: string, config: AppConfig) {
  const buffer = Buffer.from(value, "base64"); const iv = buffer.subarray(0, 12); const tag = buffer.subarray(12, 28); const body = buffer.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(config), iv); decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

export function googleConnectUrl(config: AppConfig, state: string) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CALENDAR_REDIRECT_URL) throw new Error("Google Calendar OAuth is not configured.");
  const query = new URLSearchParams({ client_id: config.GOOGLE_CLIENT_ID, redirect_uri: config.GOOGLE_CALENDAR_REDIRECT_URL, response_type: "code", access_type: "offline", prompt: "consent", scope: "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly", state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export async function exchangeGoogleCode(config: AppConfig, code: string) {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET || !config.GOOGLE_CALENDAR_REDIRECT_URL) throw new Error("Google Calendar OAuth is not configured.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: config.GOOGLE_CLIENT_ID, client_secret: config.GOOGLE_CLIENT_SECRET, redirect_uri: config.GOOGLE_CALENDAR_REDIRECT_URL, grant_type: "authorization_code" }) });
  if (!response.ok) throw new Error(`Google token exchange failed: ${response.status}`);
  return response.json() as Promise<TokenResponse>;
}

async function accessToken(connection: typeof calendarConnections.$inferSelect, config: AppConfig) {
  if (!connection.encryptedRefreshToken || !config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) throw new Error("Google Calendar is not connected.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ refresh_token: decryptSecret(connection.encryptedRefreshToken, config), client_id: config.GOOGLE_CLIENT_ID, client_secret: config.GOOGLE_CLIENT_SECRET, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error(`Google token refresh failed: ${response.status}`);
  return (await response.json() as TokenResponse).access_token;
}

export async function scheduleFocusBlock(db: Db, config: AppConfig, input: { userId: string; actionId: string; startsAt: Date; endsAt: Date }) {
  const [connection] = await db.select().from(calendarConnections).where(and(eq(calendarConnections.userId, input.userId), eq(calendarConnections.provider, "google"))).limit(1);
  const action = await db.query.actions.findFirst({ where: and(eq(actions.id, input.actionId), eq(actions.userId, input.userId)) });
  if (!connection || !action) throw new Error("A connected calendar and owned action are required.");
  const token = await accessToken(connection, config);
  const existing = await db.query.calendarEvents.findFirst({ where: and(eq(calendarEvents.connectionId, connection.id), eq(calendarEvents.actionId, action.id)) });
  const payload = { summary: action.title, description: "Scheduled by Linnet", start: { dateTime: input.startsAt.toISOString() }, end: { dateTime: input.endsAt.toISOString() }, extendedProperties: { private: { linnetOwned: "true", actionId: action.id } } };
  const url = existing ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId ?? "primary")}/events/${encodeURIComponent(existing.providerEventId)}` : `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendarId ?? "primary")}/events`;
  const response = await fetch(url, { method: existing ? "PATCH" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Google Calendar event write failed: ${response.status}`);
  const event = await response.json() as { id: string };
  if (existing) {
    await db.update(calendarEvents).set({ startsAt: input.startsAt, endsAt: input.endsAt, updatedAt: new Date() }).where(eq(calendarEvents.id, existing.id));
  } else {
    await db.insert(calendarEvents).values({ userId: input.userId, connectionId: connection.id, actionId: action.id, providerEventId: event.id, startsAt: input.startsAt, endsAt: input.endsAt, ownedByLinnet: true });
  }
  await db.update(actions).set({ status: "scheduled", scheduledFor: input.startsAt, updatedAt: new Date() }).where(eq(actions.id, action.id));
  return { providerEventId: event.id, startsAt: input.startsAt, endsAt: input.endsAt };
}
