import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { getConfig } from "@linnet/config";
import { betaInvitations, createDb, account, session, user, verification } from "@linnet/db";
import { eq } from "drizzle-orm";

const config = getConfig();
const db = createDb(config.DATABASE_URL);

export const auth = betterAuth({
  baseURL: config.BETTER_AUTH_URL,
  secret: config.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  socialProviders: config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET ? {
    google: { clientId: config.GOOGLE_CLIENT_ID, clientSecret: config.GOOGLE_CLIENT_SECRET }
  } : {},
  trustedOrigins: [config.WEB_ORIGIN, "linnet://", ...(config.NODE_ENV === "development" ? ["exp://**"] : [])],
  databaseHooks: {
    user: {
      create: {
        async before(newUser) {
          const invitation = await db.query.betaInvitations.findFirst({ where: eq(betaInvitations.email, newUser.email.toLowerCase()) });
          if (!invitation || (invitation.expiresAt && invitation.expiresAt < new Date())) throw new APIError("FORBIDDEN", { message: "This Google account has not been invited to Linnet.", code: "INVITATION_REQUIRED" });
          return { data: newUser };
        }
      }
    }
  },
  plugins: [expo()]
});

export { db };
