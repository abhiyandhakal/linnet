import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { expo } from "@better-auth/expo";
import { getConfig } from "@linnet/config";
import { createDb, account, session, user, verification } from "@linnet/db";

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
  plugins: [expo()]
});

export { db };
