import { getModel } from '../gemini';
import { z } from 'zod';

// Schema for parsed task
export const ParsedTaskSchema = z.object({
  title: z.string().describe('The main task title'),
  description: z.string().optional().describe('Additional details about the task'),
  dueDate: z.string().optional().describe('ISO 8601 date string (YYYY-MM-DD) if a date is mentioned'),
  priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority based on urgency words'),
  tags: z.array(z.string()).optional().describe('Relevant tags or categories'),
});

export type ParsedTask = z.infer<typeof ParsedTaskSchema>;

/**
 * Parse natural language text into structured task data
 * 
 * Examples:
 * - "Review project proposal tomorrow" 
 * - "High priority: Fix login bug by Friday"
 * - "Call dentist next week"
 * 
 * @param text - Natural language description of the task
 * @returns Parsed task object
 */
export async function parseTaskFromText(text: string): Promise<ParsedTask> {
  const model = getModel();
  
  const prompt = `You are a task parsing assistant. Parse the following natural language text into a structured task.

Today's date is: ${new Date().toISOString().split('T')[0]}

Extract:
1. **title**: A concise task title (required)
2. **description**: Any additional details (optional)
3. **dueDate**: If a date is mentioned (e.g., "tomorrow", "next week", "Friday", "Jan 25"), convert it to ISO format YYYY-MM-DD (optional)
4. **priority**: Infer from urgency words like "urgent", "important", "ASAP" -> "high"; "soon" -> "medium"; otherwise "low" or omit (optional)
5. **tags**: Relevant categories or contexts (e.g., "work", "personal", "urgent") (optional)

User input: "${text}"

Return ONLY valid JSON matching this schema:
{
  "title": "string (required)",
  "description": "string (optional)",
  "dueDate": "YYYY-MM-DD (optional)",
  "priority": "low" | "medium" | "high" (optional),
  "tags": ["string"] (optional, array)
}

Do not include any explanation, only the JSON object.`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();
  
  // Extract JSON from response (handle markdown code blocks)
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7, -3).trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3, -3).trim();
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    return ParsedTaskSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
