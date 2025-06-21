export type WebSocketEventType = 
  | 'connection'
  | 'chat'
  | 'tool_call'
  | 'tool_progress'
  | 'tool_result'
  | 'error'
  | 'disconnect';

export interface WebSocketMessage<T = any> {
  type: WebSocketEventType;
  payload: T;
  timestamp: number;
  sessionId?: string;
}

export interface ChatPayload {
  content: string;
  role: 'user' | 'assistant';
}

export interface ToolCallPayload {
  tool: string;
  args: Record<string, any>;
}

export interface ToolProgressPayload {
  tool: string;
  message: string;
  progress?: number;
}

export interface ToolResultPayload {
  tool: string;
  result: any;
}

export interface ErrorPayload {
  message: string;
  code?: string;
  details?: any;
}