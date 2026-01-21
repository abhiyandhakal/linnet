import { Elysia } from "elysia";
import { Auth } from "@auth/core";
import { authConfig } from "../auth.config";

// Don't use prefix - let Auth.js see the full /auth path
export const authRoutes = new Elysia()
  .all("/auth/*", async ({ request }) => {
    try {
      const response = await Auth(request, authConfig);
      return response;
    } catch (error) {
      console.error("Auth error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
