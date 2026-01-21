import { AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@linnet/db";

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After successful signin, redirect to dashboard
      if (url.startsWith("/")) return `http://localhost:3502${url}`;
      // If callback URL is already absolute and from our dashboard, allow it
      if (url.startsWith("http://localhost:3502")) return url;
      // Otherwise, redirect to dashboard home
      return "http://localhost:3502";
    },
  },
};
