import { Elysia } from "elysia";
import { Auth } from "@auth/core";
import { authConfig } from "../auth.config";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .all("/*", async ({ request }) => {
    try {
      const response = await Auth(request, authConfig);
      return response;
    } catch (error) {
      console.error("Auth error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  });
