import { Router } from 'express';
import { Agent } from '../agent';
import { SessionStore } from '../sessions';

export const chatRouter = Router();

const sessionStore = SessionStore.getInstance();

// POST /api/chat - Main chat endpoint
chatRouter.post('/', async (req, res, next) => {
  try {
    const { message, sessionId = req.sessionID, mode = 'agent', enableTools = true } = req.body;

    if (!message) {
      return res.status(400).json({
        error: {
          code: 'MISSING_MESSAGE',
          message: 'Message is required'
        }
      });
    }

    // Get or create session
    const session = sessionStore.getOrCreateSession(sessionId);

    // Add user message to history
    sessionStore.addMessage(sessionId, {
      role: 'user',
      content: message
    });

    // Create agent with session history
    const agent = new Agent(enableTools, false); // No streaming for REST
    
    // Set conversation history
    if (session.messages.length > 1) { // More than just the current message
      agent.setConversationHistory(session.messages.slice(0, -1)); // All except current
    }

    // Get response
    const response = await agent.getResponse(message);

    // Add assistant response to history
    sessionStore.addMessage(sessionId, {
      role: 'assistant',
      content: response
    });

    res.json({
      sessionId,
      message: response,
      mode,
      tools: enableTools ? agent.getAvailableTools() : [],
      history: session.messages.length
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/chat/sessions/:id - Clear session
chatRouter.delete('/sessions/:id', (req, res) => {
  const { id } = req.params;
  
  const session = sessionStore.getSession(id);
  if (!session) {
    return res.status(404).json({
      error: {
        code: 'SESSION_NOT_FOUND',
        message: `Session ${id} not found`
      }
    });
  }

  sessionStore.clearMessages(id);
  
  res.json({
    success: true,
    sessionId: id,
    message: 'Session cleared'
  });
});

// GET /api/chat/sessions/:id - Get session history
chatRouter.get('/sessions/:id', (req, res) => {
  const { id } = req.params;
  
  const session = sessionStore.getSession(id);
  if (!session) {
    return res.status(404).json({
      error: {
        code: 'SESSION_NOT_FOUND',
        message: `Session ${id} not found`
      }
    });
  }

  res.json({
    sessionId: id,
    messages: session.messages,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    messageCount: session.messages.length
  });
});

// POST /api/chat/clear - Clear current session (alternative endpoint)
chatRouter.post('/clear', (req, res) => {
  const sessionId = req.body.sessionId || req.sessionID;
  
  sessionStore.clearMessages(sessionId);
  
  res.json({
    success: true,
    sessionId,
    message: 'Chat history cleared'
  });
});

// GET /api/chat/history - Get all sessions for current user
chatRouter.get('/history', (req, res) => {
  // For now, return current session as we don't have user auth
  const sessionId = req.query.sessionId || req.sessionID;
  const session = sessionStore.getSession(sessionId as string);
  
  if (!session) {
    return res.json([]);
  }
  
  // Format for history display
  const history = [{
    id: session.id,
    timestamp: session.lastActivity,
    messageCount: session.messages.length,
    preview: session.messages.length > 0 
      ? session.messages[session.messages.length - 1].content?.substring(0, 100) + '...'
      : 'No messages'
  }];
  
  res.json(history);
});