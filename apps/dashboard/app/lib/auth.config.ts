import { AuthConfig } from "@auth/core";
import Google from "@auth/core/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@linnet/db";

export const authConfig: AuthConfig = {
  adapter: DrizzleAdapter(db),
  secret: process.env.AUTH_SECRET,
  basePath: "/api/auth",
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  trustHost: true,
  cookies: {
    sessionToken: {
      name: "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Set to true in production with HTTPS
      },
    },
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After successful signin, redirect to dashboard home
      
      // If the URL is relative, make it absolute with dashboard URL
      if (url.startsWith("/")) {
        return url;
      }
      
      // If callback URL is already absolute and from our dashboard, allow it
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default: redirect to dashboard home
      return "/";
    },
    async signIn({ user, account }) {
      // After successful sign-in, sync user to backend API
      try {
        const internalSecret = process.env.INTERNAL_SECRET;
        const apiUrl = process.env.VITE_API_URL || "http://localhost:3500";
        
        if (!internalSecret) {
          console.error("INTERNAL_SECRET not configured");
          return true; // Allow sign-in but skip sync
        }

        const response = await fetch(`${apiUrl}/internal/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret,
          },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          }),
        });

        if (!response.ok) {
          console.error("Failed to sync user to backend:", await response.text());
        }
      } catch (error) {
        console.error("Error syncing user to backend:", error);
      }

      return true; // Allow sign-in to proceed
    },
  },
};
