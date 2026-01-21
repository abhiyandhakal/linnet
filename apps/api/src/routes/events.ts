import { Elysia, t } from "elysia";
import { db, events } from "@linnet/db";
import { eq, desc, and, gte } from "drizzle-orm";

export const eventsRoutes = new Elysia({ prefix: "/events" })
  // Get all events for the authenticated user
  .get("/", async ({ query }) => {
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const userEvents = await db
      .select()
      .from(events)
      .where(eq(events.userId, userId))
      .orderBy(desc(events.startTime));
      
    return { events: userEvents };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Get upcoming events
  .get("/upcoming", async ({ query }) => {
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const now = new Date();
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(and(eq(events.userId, userId), gte(events.startTime, now)))
      .orderBy(events.startTime);
      
    return { events: upcomingEvents };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Get a single event
  .get("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const event = await db
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .limit(1);
      
    if (event.length === 0) {
      return { error: "Event not found" };
    }
    
    return { event: event[0] };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Create a new event
  .post("/", async ({ body }) => {
    const { userId, title, description, startTime, endTime, location, attendees } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const newEvent = await db
      .insert(events)
      .values({
        userId,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        attendees: attendees || [],
      })
      .returning();
      
    return { event: newEvent[0] };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.String(),
      description: t.Optional(t.String()),
      startTime: t.String(),
      endTime: t.String(),
      location: t.Optional(t.String()),
      attendees: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Update an event
  .patch("/:id", async ({ params, body }) => {
    const { id } = params;
    const { userId, title, description, startTime, endTime, location, attendees } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const updatedEvent = await db
      .update(events)
      .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(startTime && { startTime: new Date(startTime) }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(location !== undefined && { location }),
        ...(attendees && { attendees }),
        updatedAt: new Date(),
      })
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .returning();
      
    if (updatedEvent.length === 0) {
      return { error: "Event not found" };
    }
    
    return { event: updatedEvent[0] };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.Optional(t.String()),
      description: t.Optional(t.String()),
      startTime: t.Optional(t.String()),
      endTime: t.Optional(t.String()),
      location: t.Optional(t.String()),
      attendees: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Delete an event
  .delete("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const deletedEvent = await db
      .delete(events)
      .where(and(eq(events.id, id), eq(events.userId, userId)))
      .returning();
      
    if (deletedEvent.length === 0) {
      return { error: "Event not found" };
    }
    
    return { success: true };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  });
