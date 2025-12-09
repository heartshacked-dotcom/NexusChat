
import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

// NOTE: In a real production app, API calls should be routed through a backend to protect the key.
// For this demo, we assume the environment variable is available.
const apiKey = process.env.API_KEY || ''; 
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateSmartReplies = async (messages: Message[]): Promise<string[]> => {
  if (!ai) {
    console.warn("Gemini API Key missing");
    return ["👍", "Sounds good!", "Can't talk right now."];
  }

  try {
    // Construct a prompt context from the last few messages
    const recentContext = messages.slice(-5).map(m => 
      `${m.senderId === 'me' ? 'Me' : 'Partner'}: ${m.content}`
    ).join('\n');

    const prompt = `
      You are an AI assistant in a chat app. 
      Read the following conversation context and suggest 3 short, relevant, and casual text replies that "Me" could send next.
      Return ONLY the 3 phrases separated by a pipe character (|). Do not add numbering or quotes.
      
      Context:
      ${recentContext}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || "";
    const suggestions = text.split('|').map(s => s.trim()).filter(s => s.length > 0);
    return suggestions.length > 0 ? suggestions : ["Interesting!", "Tell me more.", "Ok."];

  } catch (error) {
    console.error("Gemini API Error:", error);
    return ["Error generating replies", "Try again later", "👍"];
  }
};

export const generateChatSummary = async (messages: Message[]): Promise<string> => {
  if (!ai) {
    return "AI service unavailable. Please configure API Key.";
  }

  try {
    // Summarize last 20 messages
    const context = messages.slice(-20).map(m => 
        `${m.senderId === 'me' ? 'Me' : 'Partner'}: ${m.content}`
    ).join('\n');

    const prompt = `
      Summarize the following chat conversation in 3-4 bullet points. Focus on key decisions, dates, or topics discussed.
      
      Conversation:
      ${context}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    return response.text || "Could not generate summary.";
  } catch (error) {
      console.error("Gemini Summary Error:", error);
      return "Error generating summary.";
  }
}
