import { getModel } from '../gemini';
import { z } from 'zod';

// Schema for parsed event
export const ParsedEventSchema = z.object({
  title: z.string().describe('The event title'),
  description: z.string().optional().describe('Additional details about the event'),
  startTime: z.string().describe('ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS)'),
  endTime: z.string().optional().describe('ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS)'),
  location: z.string().optional().describe('Event location or meeting link'),
  attendees: z.array(z.string()).optional().describe('List of attendee names'),
});

export type ParsedEvent = z.infer<typeof ParsedEventSchema>;

/**
 * Parse natural language text into structured event data
 * 
 * Examples:
 * - "Meeting with John tomorrow at 3pm"
 * - "Dentist appointment Friday 2pm to 3pm"
 * - "Team standup every day at 9am for 15 minutes"
 * 
 * @param text - Natural language description of the event
 * @returns Parsed event object
 */
export async function parseEventFromText(text: string): Promise<ParsedEvent> {
  const model = getModel();
  
  const now = new Date();
  const currentDateTime = now.toISOString();
  const currentDate = now.toISOString().split('T')[0];
  
  const prompt = `You are an event parsing assistant. Parse the following natural language text into a structured calendar event.

Current date and time: ${currentDateTime}
Today's date: ${currentDate}

Extract:
1. **title**: A concise event title (required)
2. **description**: Any additional details (optional)
3. **startTime**: Event start date and time in ISO format YYYY-MM-DDTHH:MM:SS (required)
   - Convert relative dates like "tomorrow", "Friday", "next Monday"
   - If no time specified, assume 9:00 AM
4. **endTime**: Event end time in ISO format YYYY-MM-DDTHH:MM:SS (optional)
   - If duration mentioned (e.g., "for 1 hour", "15 minutes"), calculate from startTime
   - If no duration, assume 1 hour from start
5. **location**: Physical location, room number, or video call link (optional)
6. **attendees**: Array of names mentioned (optional)

User input: "${text}"

Return ONLY valid JSON matching this schema:
{
  "title": "string (required)",
  "description": "string (optional)",
  "startTime": "YYYY-MM-DDTHH:MM:SS (required)",
  "endTime": "YYYY-MM-DDTHH:MM:SS (optional)",
  "location": "string (optional)",
  "attendees": ["string"] (optional, array)
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
    const validated = ParsedEventSchema.parse(parsed);
    
    // If endTime not provided, add 1 hour to startTime
    if (!validated.endTime) {
      const start = new Date(validated.startTime);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour
      validated.endTime = end.toISOString().replace(/\.\d{3}Z$/, '');
    }
    
    return validated;
  } catch (error) {
    throw new Error(`Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
