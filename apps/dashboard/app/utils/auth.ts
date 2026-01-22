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
 * Fetch the current session from the dashboard's local auth endpoint
 */
export async function getSession(): Promise<Session> {
  try {
    const baseUrl =
      typeof window === "undefined"
        ? process.env.DASHBOARD_URL || process.env.AUTH_URL || "http://localhost:3502"
        : "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(`${baseUrl}/api/auth/session`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { user: null };
    }

    const session: Session = await response.json();
    return session || { user: null };
  } catch (error) {
    console.error("Failed to fetch session:", error);
    return { user: null };
  }
}
