import { getGeminiClient } from './gemini';

/**
 * Generate embeddings for text using Gemini's embedding model
 * 
 * @param text - Text to generate embeddings for
 * @param taskType - The task type for the embedding model (e.g., 'RETRIEVAL_DOCUMENT', 'RETRIEVAL_QUERY')
 * @returns Array of embedding values (vector)
 */
export async function generateEmbedding(
  text: string,
  taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const client = getGeminiClient();
  const model = client.getGenerativeModel({ model: 'text-embedding-004' });
  
  const result = await model.embedContent(text);
  
  return result.embedding.values;
}

/**
 * Calculate cosine similarity between two vectors
 * Used for finding similar embeddings
 * 
 * @param a - First vector
 * @param b - Second vector
 * @returns Similarity score between -1 and 1 (higher is more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
