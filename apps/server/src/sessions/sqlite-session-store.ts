import { AgentMessage } from '../agent';
import { db, sessionStatements, messageStatements, transaction } from '../database';

export interface Session {
  id: string;
  messages: AgentMessage[];
  createdAt: Date;
  lastActivity: Date;
  userId?: string;
}

export class SQLiteSessionStore {
  private static instance: SQLiteSessionStore;

  private constructor() {}

  static getInstance(): SQLiteSessionStore {
    if (!SQLiteSessionStore.instance) {
      SQLiteSessionStore.instance = new SQLiteSessionStore();
    }
    return SQLiteSessionStore.instance;
  }

  createSession(sessionId: string, userId?: string): Session {
    const metadata = JSON.stringify({ userAgent: '', ip: '' });
    
    transaction(() => {
      sessionStatements.create.run(sessionId, userId || null, metadata);
    });

    return {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
      userId
    };
  }

  getSession(sessionId: string): Session | null {
    const sessionRow = sessionStatements.get.get(sessionId) as any;
    
    if (!sessionRow) {
      return null;
    }

    const messages = this.getMessages(sessionId);
    
    return {
      id: sessionRow.id,
      messages,
      createdAt: new Date(sessionRow.created_at),
      lastActivity: new Date(sessionRow.last_activity),
      userId: sessionRow.user_id
    };
  }

  getOrCreateSession(sessionId: string, userId?: string): Session {
    let session = this.getSession(sessionId);
    if (!session) {
      session = this.createSession(sessionId, userId);
    }
    return session;
  }

  private getMessages(sessionId: string): AgentMessage[] {
    const rows = messageStatements.getBySession.all(sessionId) as any[];
    
    return rows.map(row => ({
      role: row.role as 'user' | 'assistant' | 'system' | 'tool',
      content: row.content,
      tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      tool_call_id: row.tool_call_id || undefined,
      timestamp: row.timestamp
    }));
  }

  addMessage(sessionId: string, message: AgentMessage): void {
    transaction(() => {
      // Update session activity
      sessionStatements.update.run(sessionId);
      
      // Add message
      messageStatements.create.run(
        sessionId,
        message.role,
        message.content,
        message.tool_calls ? JSON.stringify(message.tool_calls) : null,
        message.tool_call_id || null
      );
    });
  }

  updateSession(sessionId: string, messages: AgentMessage[]): void {
    transaction(() => {
      // Delete existing messages
      messageStatements.deleteBySession.run(sessionId);
      
      // Add all messages
      for (const message of messages) {
        messageStatements.create.run(
          sessionId,
          message.role,
          message.content,
          message.tool_calls ? JSON.stringify(message.tool_calls) : null,
          message.tool_call_id || null
        );
      }
      
      // Update session activity
      sessionStatements.update.run(sessionId);
    });
  }

  deleteSession(sessionId: string): void {
    transaction(() => {
      sessionStatements.delete.run(sessionId);
    });
  }

  clearMessages(sessionId: string): void {
    transaction(() => {
      messageStatements.deleteBySession.run(sessionId);
      sessionStatements.update.run(sessionId);
    });
  }

  getUserSessions(userId: string): Session[] {
    const rows = sessionStatements.getByUser.all(userId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      messages: this.getMessages(row.id),
      createdAt: new Date(row.created_at),
      lastActivity: new Date(row.last_activity),
      userId: row.user_id
    }));
  }

  // Get recent messages for a session (useful for context window)
  getRecentMessages(sessionId: string, limit: number = 10): AgentMessage[] {
    const rows = messageStatements.getRecent.all(sessionId, limit) as any[];
    
    return rows.reverse().map(row => ({
      role: row.role as 'user' | 'assistant' | 'system' | 'tool',
      content: row.content,
      tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      tool_call_id: row.tool_call_id || undefined,
      timestamp: row.timestamp
    }));
  }
}