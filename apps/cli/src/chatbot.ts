export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
}

export class ChatBot {
  private mode: "echo";

  constructor(mode: "echo" = "echo") {
    this.mode = mode;
  }

  async getResponse(userInput: string): Promise<string> {
    return userInput;
  }

  clearHistory() {
    // No history in echo mode
  }

  async *getStreamingResponse(userInput: string): AsyncGenerator<string, void, unknown> {
    yield userInput;
  }

  getMode() {
    return this.mode;
  }
}
