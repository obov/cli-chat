export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface StreamingMessage extends ChatMessage {
  isStreaming?: boolean;
  delta?: string;
}