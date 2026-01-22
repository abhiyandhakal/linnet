import { Elysia, t } from "elysia";
import { db, users } from "@linnet/db";
import { eq } from "drizzle-orm";

export const internalRoutes = new Elysia({ prefix: "/internal" })
  .post(
    "/users",
    async ({ body, headers, set }) => {
      // Verify internal secret
      const secret = headers["x-internal-secret"];
      const expectedSecret = process.env.INTERNAL_SECRET;

      if (!expectedSecret) {
        console.error("INTERNAL_SECRET not configured on API");
        set.status = 500;
        return { error: "Server misconfigured" };
      }

      if (secret !== expectedSecret) {
        set.status = 401;
        return { error: "Unauthorized" };
      }

      try {
        // Upsert user - insert or update if exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.id, body.id))
          .limit(1);

        if (existingUser.length > 0) {
          // Update existing user
          await db
            .update(users)
            .set({
              email: body.email,
              name: body.name,
              image: body.image,
            })
            .where(eq(users.id, body.id));
        } else {
          // Insert new user
          await db.insert(users).values({
            id: body.id,
            email: body.email,
            name: body.name,
            image: body.image,
          });
        }

        return { ok: true, userId: body.id };
      } catch (error) {
        console.error("Error syncing user:", error);
        set.status = 500;
        return { error: "Failed to sync user" };
      }
    },
    {
      body: t.Object({
        id: t.String(),
        email: t.String(),
        name: t.Optional(t.String()),
        image: t.Optional(t.String()),
      }),
    }
  );
