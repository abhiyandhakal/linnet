import { Elysia } from "elysia";

export const app = new Elysia().get("/health", () => ({ status: "ok" }));

export type App = typeof app;
