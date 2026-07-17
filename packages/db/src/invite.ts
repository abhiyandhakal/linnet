import { eq } from "drizzle-orm";
import { createDb } from "./index";
import { betaInvitations } from "./schema";

const email = Bun.argv[2]?.trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL;
if (!email || !email.includes("@")) throw new Error("Usage: bun run db:invite -- person@example.com");
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const db = createDb(databaseUrl);
const existing = await db.query.betaInvitations.findFirst({ where: eq(betaInvitations.email, email) });
if (existing) {
  console.log(`${email} is already invited.`);
} else {
  await db.insert(betaInvitations).values({ email });
  console.log(`Invited ${email}.`);
}
