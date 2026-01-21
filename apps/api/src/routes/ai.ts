import { Elysia, t } from 'elysia';
import { parseTaskFromText, parseEventFromText, generateDailyBriefing, generateEmbedding } from '@linnet/logic';
import { db, tasks, events, notes, embeddings } from '@linnet/db';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';

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
  })
  
  // Semantic search for notes using vector embeddings
  .get('/search-notes', async ({ query }) => {
    try {
      const { userId, query: searchQuery, limit: limitStr } = query;
      
      if (!userId || !searchQuery) {
        return { error: 'userId and query are required' };
      }
      
      const limit = limitStr ? parseInt(limitStr, 10) : 10;
      
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(searchQuery, 'RETRIEVAL_QUERY');
      
      // Convert embedding array to vector string format for pgvector
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      // Use pgvector's cosine distance operator (<=>)
      // Lower distance = more similar, so we compute 1 - distance to get similarity score
      const results = await db
        .select({
          noteId: embeddings.entityId,
          similarity: sql<number>`1 - (${embeddings.embedding} <=> ${vectorString}::vector)`,
          content: embeddings.content,
        })
        .from(embeddings)
        .where(
          and(
            eq(embeddings.userId, userId),
            eq(embeddings.entityType, 'note')
          )
        )
        .orderBy(sql`${embeddings.embedding} <=> ${vectorString}::vector ASC`)
        .limit(limit);
      
      // Fetch the actual notes
      if (results.length === 0) {
        return { notes: [], scores: [] };
      }
      
      const noteIds = results.map(r => r.noteId);
      const userNotes = await db
        .select()
        .from(notes)
        .where(inArray(notes.id, noteIds));
      
      // Map notes with their similarity scores
      const notesWithScores = userNotes.map(note => {
        const result = results.find(r => r.noteId === note.id);
        return {
          ...note,
          similarity: result?.similarity || 0,
        };
      });
      
      // Sort by similarity (highest first)
      notesWithScores.sort((a, b) => b.similarity - a.similarity);
      
      return { 
        notes: notesWithScores,
        query: searchQuery,
      };
    } catch (error) {
      console.error('Error performing semantic search:', error);
      return { error: 'Failed to perform semantic search', details: error instanceof Error ? error.message : 'Unknown error' };
    }
  }, {
    query: t.Object({
      userId: t.String(),
      query: t.String(),
      limit: t.Optional(t.String()),
    }),
  });
