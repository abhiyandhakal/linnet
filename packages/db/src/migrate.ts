import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./index";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
await migrate(createDb(url), { migrationsFolder: "drizzle" });
