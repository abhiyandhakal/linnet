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
 * 
 * @param headers - Optional headers to forward (e.g., cookies from server-side request)
 */
export async function getSession(headers?: HeadersInit): Promise<Session> {
  try {
    const apiUrl = process.env.VITE_API_URL || "http://localhost:3500";
    
    // Build headers object
    const fetchHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(headers || {}),
    };
    
    const response = await fetch(`${apiUrl}/auth/session`, {
      credentials: "include",
      headers: fetchHeaders,
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
