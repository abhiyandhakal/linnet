import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth";
import { tasksRoutes } from "./routes/tasks";
import { eventsRoutes } from "./routes/events";

const app = new Elysia()
  .use(cors({
    origin: [
      process.env.LANDING_URL || "http://localhost:3501",
      process.env.DASHBOARD_URL || "http://localhost:3502"
    ],
    credentials: true,
  }))
  .use(authRoutes)
  .use(tasksRoutes)
  .use(eventsRoutes)
  .get("/", () => "Hello Elysia")
  .listen(process.env.API_PORT || 3500);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export type App = typeof app;
