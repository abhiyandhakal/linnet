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
 * Fetch the current session from the API
 * This is a regular async function that can be called from loaders
 */
export async function getSession(): Promise<Session> {
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
}
