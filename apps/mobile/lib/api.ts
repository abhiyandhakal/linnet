import { createApi } from "@linnet/api-client";
import { authClient } from "./auth";

export const api = createApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  credentials: "omit",
  getHeaders: (): Record<string, string> => {
    const cookies = authClient.getCookie();
    return cookies ? { Cookie: cookies } : {};
  }
});
