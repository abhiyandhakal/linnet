import { Elysia } from "elysia";
import { internalRoutes as usersRoutes } from "./users";

export const internalRoutes = new Elysia()
  .use(usersRoutes);
