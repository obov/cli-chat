import { Router } from 'express';
import { SessionStore } from '../sessions/session-store';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const sessionStore = SessionStore.getInstance();
  const sessions = sessionStore.getAllSessions();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    sessions: {
      active: sessions.length,
      total: sessions.reduce((acc, session) => acc + session.messages.length, 0)
    },
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});