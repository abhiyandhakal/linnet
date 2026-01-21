import { AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@linnet/db";

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db),
  secret: process.env.AUTH_SECRET,
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
      const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3502";
      const landingUrl = process.env.LANDING_URL || "http://localhost:3501";
      
      // After successful signin from landing page, redirect to dashboard
      
      // If the URL is relative, make it absolute with dashboard URL
      if (url.startsWith("/")) {
        return `${dashboardUrl}${url}`;
      }
      
      // If callback URL is already absolute and from our dashboard, allow it
      if (url.startsWith(dashboardUrl)) {
        return url;
      }
      
      // If callback is to landing page, redirect to dashboard instead
      if (url.startsWith(landingUrl)) {
        return dashboardUrl;
      }
      
      // Default: redirect to dashboard home
      return dashboardUrl;
    },
  },
};
