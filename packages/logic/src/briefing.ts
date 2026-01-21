import { getModel } from './gemini';

export interface BriefingData {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    priority?: string;
    dueDate?: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    location?: string;
  }>;
  notes: Array<{
    id: string;
    title: string;
    tags: string[];
  }>;
}

export interface DailyBriefing {
  summary: string;
  upcomingTasks: string[];
  upcomingEvents: string[];
  suggestions: string[];
}

/**
 * Generate a personalized daily briefing based on user's tasks, events, and notes
 * 
 * @param data - User's tasks, events, and notes
 * @returns Daily briefing with summary and suggestions
 */
export async function generateDailyBriefing(data: BriefingData): Promise<DailyBriefing> {
  const model = getModel();
  
  const now = new Date();
  const today = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const prompt = `You are a personal assistant creating a daily briefing for the user.

Today is: ${today}

**User's Tasks:**
${data.tasks.length > 0 
  ? data.tasks.map(t => `- [${t.status}] ${t.title}${t.dueDate ? ` (Due: ${t.dueDate})` : ''}${t.priority ? ` [${t.priority}]` : ''}`).join('\n')
  : 'No tasks'}

**User's Events:**
${data.events.length > 0
  ? data.events.map(e => `- ${e.title} (${new Date(e.startTime).toLocaleString()} - ${new Date(e.endTime).toLocaleTimeString()})${e.location ? ` @ ${e.location}` : ''}`).join('\n')
  : 'No events scheduled'}

**Recent Notes:**
${data.notes.length > 0
  ? data.notes.map(n => `- ${n.title}${n.tags.length > 0 ? ` [${n.tags.join(', ')}]` : ''}`).join('\n')
  : 'No notes'}

Generate a friendly, concise daily briefing with:
1. **summary**: A warm greeting and 2-3 sentence overview of the day
2. **upcomingTasks**: Array of 3-5 most important tasks to focus on (prioritize by due date and priority)
3. **upcomingEvents**: Array of today's events in chronological order
4. **suggestions**: Array of 2-3 helpful suggestions (e.g., prepare for meetings, complete overdue tasks, take breaks)

Return ONLY valid JSON:
{
  "summary": "string",
  "upcomingTasks": ["string"],
  "upcomingEvents": ["string"],
  "suggestions": ["string"]
}`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const responseText = response.text();
  
  // Extract JSON from response
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.slice(7, -3).trim();
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.slice(3, -3).trim();
  }
  
  try {
    const parsed = JSON.parse(jsonText);
    return parsed as DailyBriefing;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
