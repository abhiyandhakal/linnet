import { Elysia, t } from 'elysia';
import { parseTaskFromText, parseEventFromText, generateDailyBriefing } from '@linnet/logic';
import { db, tasks, events, notes } from '@linnet/db';
import { eq, and, gte } from 'drizzle-orm';

export const aiRoutes = new Elysia({ prefix: '/ai' })
  // Parse task from natural language
  .post('/parse-task', async ({ body }) => {
    try {
      const { text } = body;
      
      if (!text || typeof text !== 'string') {
        return { error: 'Text is required' };
      }
      
      const parsedTask = await parseTaskFromText(text);
      
      return { task: parsedTask };
    } catch (error) {
      console.error('Error parsing task:', error);
      return { error: 'Failed to parse task', details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, {
    body: t.Object({
      text: t.String(),
    }),
  })
  
  // Parse event from natural language
  .post('/parse-event', async ({ body }) => {
    try {
      const { text } = body;
      
      if (!text || typeof text !== 'string') {
        return { error: 'Text is required' };
      }
      
      const parsedEvent = await parseEventFromText(text);
      
      return { event: parsedEvent };
    } catch (error) {
      console.error('Error parsing event:', error);
      return { error: 'Failed to parse event', details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, {
    body: t.Object({
      text: t.String(),
    }),
  })
  
  // Generate daily briefing
  .get('/briefing', async ({ query }) => {
    try {
      const { userId } = query;
      
      if (!userId) {
        return { error: 'userId is required' };
      }
      
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Fetch user's tasks (not completed, ordered by priority and due date)
      const userTasks = await db.select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.status, 'todo')
        )
      )
      .limit(10);
      
      // Fetch today's and upcoming events
      const userEvents = await db.select({
        id: events.id,
        title: events.title,
        startTime: events.startTime,
        endTime: events.endTime,
        location: events.location,
      })
      .from(events)
      .where(
        and(
          eq(events.userId, userId),
          gte(events.startTime, today)
        )
      )
      .limit(10);
      
      // Fetch recent notes
      const userNotes = await db.select({
        id: notes.id,
        title: notes.title,
        tags: notes.tags,
      })
      .from(notes)
      .where(eq(notes.userId, userId))
      .limit(5);
      
      // Generate briefing
      const briefing = await generateDailyBriefing({
        tasks: userTasks.map(t => ({
          ...t,
          status: t.status || 'todo',
          priority: t.priority || undefined,
          dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : undefined,
        })),
        events: userEvents.map(e => ({
          ...e,
          startTime: e.startTime.toISOString(),
          endTime: e.endTime.toISOString(),
          location: e.location || undefined,
        })),
        notes: userNotes.map(n => ({
          ...n,
          tags: n.tags || [],
        })),
      });
      
      return { briefing };
    } catch (error) {
      console.error('Error generating briefing:', error);
      return { error: 'Failed to generate briefing', details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  });
