import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as usersSchema from "./schema/users";
import * as appSchema from "./schema/app";

// Merge schemas
export const schema = { ...usersSchema, ...appSchema };

// Initialize client
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Export schema types
export * from "./schema/users";
export * from "./schema/app";
