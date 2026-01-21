import { Elysia } from "elysia";
import { Auth } from "@auth/core";
import { authConfig } from "../auth.config";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/session", async ({ request }) => {
    try {
      // Create a session request
      const url = new URL(request.url);
      url.pathname = "/auth/session";
      const sessionRequest = new Request(url, {
        headers: request.headers,
        method: "GET",
      });
      const response = await Auth(sessionRequest, authConfig);
      return response;
    } catch (error) {
      console.error("Session error:", error);
      return new Response(JSON.stringify({ user: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  })
  .all("/*", async ({ request }) => {
    try {
      const response = await Auth(request, authConfig);
      return response;
    } catch (error) {
      console.error("Auth error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
