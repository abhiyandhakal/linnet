import { createServerFn } from "@tanstack/start";

export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface Session {
  user?: User | null;
  expires?: string;
}

/**
 * Server function to get the current session from the API
 */
export const getSession = createServerFn("GET", async () => {
  try {
    const response = await fetch("http://localhost:3500/auth/session", {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return { user: null };
    }

    const session: Session = await response.json();
    return session;
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return { user: null };
  }
});
