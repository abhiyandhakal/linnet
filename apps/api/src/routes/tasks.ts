import { Elysia, t } from "elysia";
import { db, tasks } from "@linnet/db";
import { eq, desc, and } from "drizzle-orm";

export const tasksRoutes = new Elysia({ prefix: "/tasks" })
  // Get all tasks for the authenticated user
  .get("/", async ({ query }) => {
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
      
    return { tasks: userTasks };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Get a single task
  .get("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
      
    if (task.length === 0) {
      return { error: "Task not found" };
    }
    
    return { task: task[0] };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Create a new task
  .post("/", async ({ body }) => {
    const { userId, title, description, dueDate, priority, status, tags } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const newTask = await db
      .insert(tasks)
      .values({
        userId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        status: status || "todo",
        tags: tags || [],
      })
      .returning();
      
    return { task: newTask[0] };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.String(),
      description: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
      priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
      status: t.Optional(t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done"), t.Literal("cancelled")])),
      tags: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Update a task
  .patch("/:id", async ({ params, body }) => {
    const { id } = params;
    const { userId, title, description, dueDate, priority, status, tags } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const updatedTask = await db
      .update(tasks)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(tags && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
      
    if (updatedTask.length === 0) {
      return { error: "Task not found" };
    }
    
    return { task: updatedTask[0] };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      dueDate: t.Optional(t.String()),
      priority: t.Optional(t.Union([t.Literal("low"), t.Literal("medium"), t.Literal("high")])),
      status: t.Optional(t.Union([t.Literal("todo"), t.Literal("in_progress"), t.Literal("done"), t.Literal("cancelled")])),
      tags: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Delete a task
  .delete("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const deletedTask = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
      
    if (deletedTask.length === 0) {
      return { error: "Task not found" };
    }
    
    return { success: true };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  });
