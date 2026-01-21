import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI client
let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export function getModel(modelName: string = 'gemini-1.5-flash') {
  const client = getGeminiClient();
  return client.getGenerativeModel({ model: modelName });
}
