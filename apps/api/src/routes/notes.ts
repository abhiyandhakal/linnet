import { Elysia, t } from "elysia";
import { db, notes, embeddings } from "@linnet/db";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import { generateEmbedding } from "@linnet/logic";

export const notesRoutes = new Elysia({ prefix: "/notes" })
  // Get all notes for the authenticated user
  .get("/", async ({ query }) => {
    const { userId, search } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    let userNotes;
    
    if (search) {
      // Search in title and content
      userNotes = await db
        .select()
        .from(notes)
        .where(
          and(
            eq(notes.userId, userId),
            or(
              like(notes.title, `%${search}%`),
              like(notes.content, `%${search}%`)
            )
          )
        )
        .orderBy(desc(notes.updatedAt));
    } else {
      userNotes = await db
        .select()
        .from(notes)
        .where(eq(notes.userId, userId))
        .orderBy(desc(notes.updatedAt));
    }
      
    return { notes: userNotes };
  }, {
    query: t.Object({
      userId: t.String(),
      search: t.Optional(t.String()),
    }),
  })
  
  // Get a single note
  .get("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const note = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .limit(1);
      
    if (note.length === 0) {
      return { error: "Note not found" };
    }
    
    return { note: note[0] };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  })
  
  // Create a new note
  .post("/", async ({ body }) => {
    const { userId, title, content, tags } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const newNote = await db
      .insert(notes)
      .values({
        userId,
        title,
        content,
        tags: tags || [],
      })
      .returning();
    
    // Generate and store embedding asynchronously (don't block response)
    const note = newNote[0];
    generateEmbedding(`${title}\n\n${content}`, 'RETRIEVAL_DOCUMENT')
      .then(async (embeddingVector) => {
        await db.insert(embeddings).values({
          userId,
          entityType: 'note',
          entityId: note.id,
          content: `${title}\n\n${content}`,
          embedding: embeddingVector, // Pass as number array
        });
      })
      .catch((error) => {
        console.error('Failed to generate embedding:', error);
      });
      
    return { note };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.String(),
      content: t.String(),
      tags: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Update a note
  .patch("/:id", async ({ params, body }) => {
    const { id } = params;
    const { userId, title, content, tags } = body;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const updatedNote = await db
      .update(notes)
      .set({
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(tags && { tags }),
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
      
    if (updatedNote.length === 0) {
      return { error: "Note not found" };
    }
    
    const note = updatedNote[0];
    
    // Regenerate embedding if title or content changed
    if (title || content !== undefined) {
      generateEmbedding(`${note.title}\n\n${note.content}`, 'RETRIEVAL_DOCUMENT')
        .then(async (embeddingVector) => {
          // Delete old embedding and create new one
          await db.delete(embeddings)
            .where(and(
              eq(embeddings.entityType, 'note'),
              eq(embeddings.entityId, id)
            ));
          
          await db.insert(embeddings).values({
            userId,
            entityType: 'note',
            entityId: id,
            content: `${note.title}\n\n${note.content}`,
            embedding: embeddingVector, // Pass as number array
          });
        })
        .catch((error) => {
          console.error('Failed to regenerate embedding:', error);
        });
    }
    
    return { note };
  }, {
    body: t.Object({
      userId: t.String(),
      title: t.Optional(t.String()),
      content: t.Optional(t.String()),
      tags: t.Optional(t.Array(t.String())),
    }),
  })
  
  // Delete a note
  .delete("/:id", async ({ params, query }) => {
    const { id } = params;
    const { userId } = query;
    
    if (!userId) {
      return { error: "Unauthorized" };
    }
    
    const deletedNote = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
      
    if (deletedNote.length === 0) {
      return { error: "Note not found" };
    }
    
    return { success: true };
  }, {
    query: t.Object({
      userId: t.String(),
    }),
  });
