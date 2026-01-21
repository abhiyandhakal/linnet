import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";

const app = new Elysia()
  .use(cors({
    origin: ["http://localhost:3501", "http://localhost:3502"],
    credentials: true,
  }))
  .use(authRoutes)
  .get("/", () => "Hello Elysia")
  .listen(process.env.API_PORT || 3500);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
