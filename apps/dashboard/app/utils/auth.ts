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
 * Cookies with domain=localhost will be shared across all ports
 */
export async function getSession(): Promise<Session> {
  try {
    const apiUrl = process.env.VITE_API_URL || "http://localhost:3500";
    
    const response = await fetch(`${apiUrl}/auth/session`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

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
