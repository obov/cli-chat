import { Router } from 'express';
import { SessionStore } from '../sessions/session-store';

export const sessionRouter = Router();

const sessionStore = SessionStore.getInstance();

// GET /api/session - Get current session info
sessionRouter.get('/', (req, res) => {
  // Get or create session ID from request
  const sessionId = req.session?.id || req.headers['x-session-id'] || `session-${Date.now()}`;
  
  // Get or create session
  let session = sessionStore.getSession(sessionId);
  if (!session) {
    session = sessionStore.createSession(sessionId);
  }

  res.json({
    sessionId,
    messageCount: session.messages.length,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity
  });
});

// DELETE /api/session/:id - Clear specific session
sessionRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ error: 'Session ID is required' });
  }

  sessionStore.clearMessages(id);
  
  res.json({ 
    success: true, 
    message: 'Session cleared',
    sessionId: id 
  });
});

// DELETE /api/session - Clear current session
sessionRouter.delete('/', (req, res) => {
  const sessionId = req.session?.id || req.headers['x-session-id'];
  
  if (!sessionId) {
    return res.status(400).json({ error: 'No active session found' });
  }

  sessionStore.clearMessages(sessionId);
  
  res.json({ 
    success: true, 
    message: 'Session cleared',
    sessionId 
  });
});