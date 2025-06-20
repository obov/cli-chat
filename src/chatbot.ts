import OpenAI from "openai";
import { config } from "./config";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export class ChatBot {
  private openai: OpenAI | null = null;
  private messages: Message[] = [];
  private mode: "echo" | "openai";

  constructor(mode: "echo" | "openai" = "echo") {
    this.mode = mode;

    if (mode === "openai" && config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });

      // Add system message
      this.messages.push({
        role: "system",
        content: "You are a helpful assistant in a CLI chatbot application.",
      });
    }
  }

  async getResponse(userInput: string): Promise<string> {
    if (this.mode === "echo") {
      return userInput;
    }

    if (!this.openai) {
      return "Error: OpenAI client not initialized";
    }

    try {
      // Add user message to history
      this.messages.push({ role: "user", content: userInput });

      // Get response from OpenAI
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      });

      const assistantMessage =
        completion.choices[0]?.message?.content || "No response";

      // Add assistant response to history
      this.messages.push({ role: "assistant", content: assistantMessage });

      return assistantMessage;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return "Error: Failed to get response from OpenAI";
    }
  }

  clearHistory() {
    // Keep system message if it exists
    this.messages = this.messages.filter((msg) => msg.role === "system");
  }

  getMode() {
    return this.mode;
  }
}
