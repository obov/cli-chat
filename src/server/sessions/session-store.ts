import { Message } from '../../chatbot';

export interface Session {
  id: string;
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
}

export class SessionStore {
  private static instance: SessionStore;
  private sessions: Map<string, Session>;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.sessions = new Map();
    this.startCleanupInterval();
  }

  static getInstance(): SessionStore {
    if (!SessionStore.instance) {
      SessionStore.instance = new SessionStore();
    }
    return SessionStore.instance;
  }

  createSession(id: string): Session {
    const session: Session = {
      id,
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };
    this.sessions.set(id, session);
    return session;
  }

  getSession(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
    }
    return session;
  }

  getOrCreateSession(id: string): Session {
    let session = this.getSession(id);
    if (!session) {
      session = this.createSession(id);
    }
    return session;
  }

  deleteSession(id: string): boolean {
    return this.sessions.delete(id);
  }

  addMessage(sessionId: string, message: Message): void {
    const session = this.getOrCreateSession(sessionId);
    session.messages.push(message);
    session.lastActivity = new Date();
  }

  clearMessages(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.messages = [];
      session.lastActivity = new Date();
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions.entries()) {
        if (now - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
          this.sessions.delete(id);
        }
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }
}