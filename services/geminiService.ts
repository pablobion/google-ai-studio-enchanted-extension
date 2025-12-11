import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role } from '../types';

// Ensure API key is present
const API_KEY = process.env.API_KEY || '';

class GeminiService {
  private client: GoogleGenAI;
  private chatSession: Chat | null = null;
  private modelName: string = 'gemini-2.5-flash'; // Optimized for speed/chat

  constructor() {
    this.client = new GoogleGenAI({ apiKey: API_KEY });
  }

  /**
   * Initializes or resets the chat session.
   * We pass previous history to maintain context if needed, 
   * although the SDK's Chat object manages history internally once created.
   */
  public startChat(history: ChatMessage[] = []) {
    // Convert our internal message format to the SDK's format if needed for initialization
    // For simplicity in this demo, we'll start fresh or rely on the SDK's internal state management
    // If we needed to restore history:
    /*
    const historyForSdk = history.map(msg => ({
      role: msg.role === Role.USER ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));
    */
    
    this.chatSession = this.client.chats.create({
      model: this.modelName,
      config: {
        systemInstruction: "You are a helpful, concise, and intelligent AI assistant inside the 'Enchanted' interface.",
      }
    });
  }

  /**
   * Sends a message to the model and returns the response text.
   */
  public async sendMessage(message: string): Promise<string> {
    if (!API_KEY) {
      throw new Error("API Key is missing. Please check your environment configuration.");
    }

    if (!this.chatSession) {
      this.startChat();
    }

    try {
      // Use the chat session to send a message
      const result: GenerateContentResponse = await this.chatSession!.sendMessage({
        message: message
      });
      
      return result.text || "";
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();