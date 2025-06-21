import { Router } from 'express';
import { Agent } from '../../agent';
import { SessionStore } from '../sessions/session-store';

export const streamRouter = Router();

const sessionStore = SessionStore.getInstance();

// Helper function to send SSE event
function sendSSEEvent(res: any, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

// GET /api/chat/stream - SSE streaming endpoint
streamRouter.get('/', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Get parameters from query string
  const { message, sessionId = req.sessionID, enableTools = true } = req.query;

  if (!message || typeof message !== 'string') {
    sendSSEEvent(res, 'error', {
      code: 'MISSING_MESSAGE',
      message: 'Message is required as query parameter'
    });
    res.end();
    return;
  }

  try {
    // Get or create session
    const session = sessionStore.getOrCreateSession(sessionId as string);

    // Add user message to history
    sessionStore.addMessage(sessionId as string, {
      role: 'user',
      content: message
    });

    // Create agent with streaming enabled
    const agent = new Agent(enableTools === 'true' || enableTools === true, true);
    
    // Set conversation history
    if (session.messages.length > 1) {
      agent.setConversationHistory(session.messages.slice(0, -1));
    }

    // Get streaming response
    const stream = agent.getStreamingResponse(message);

    let fullResponse = '';

    // Process the stream
    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        sendSSEEvent(res, 'tool_call', {
          tool: chunk.name,
          args: chunk.args
        });
      } else if (chunk.type === 'tool_progress') {
        sendSSEEvent(res, 'tool_progress', {
          tool: chunk.name,
          message: chunk.message
        });
      } else if (chunk.type === 'tool_result') {
        sendSSEEvent(res, 'tool_result', {
          tool: chunk.name,
          result: chunk.result
        });
      } else if (chunk.type === 'token') {
        fullResponse += chunk.content || '';
        sendSSEEvent(res, 'token', {
          content: chunk.content
        });
      }
    }

    // Add assistant response to history
    sessionStore.addMessage(sessionId as string, {
      role: 'assistant',
      content: fullResponse
    });

    // Send completion event
    sendSSEEvent(res, 'done', {
      message: 'complete',
      sessionId,
      historyLength: session.messages.length
    });

    res.end();
  } catch (error: any) {
    sendSSEEvent(res, 'error', {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An error occurred during streaming'
    });
    res.end();
  }
});

// POST /api/chat/stream - Alternative POST endpoint for SSE
streamRouter.post('/', async (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { message, sessionId = req.sessionID, enableTools = true } = req.body;

  if (!message) {
    sendSSEEvent(res, 'error', {
      code: 'MISSING_MESSAGE',
      message: 'Message is required'
    });
    res.end();
    return;
  }

  try {
    // Get or create session
    const session = sessionStore.getOrCreateSession(sessionId);

    // Add user message to history
    sessionStore.addMessage(sessionId, {
      role: 'user',
      content: message
    });

    // Create agent with streaming enabled
    const agent = new Agent(enableTools, true);
    
    // Set conversation history
    if (session.messages.length > 1) {
      agent.setConversationHistory(session.messages.slice(0, -1));
    }

    // Get streaming response
    const stream = agent.getStreamingResponse(message);

    let fullResponse = '';

    // Process the stream
    for await (const chunk of stream) {
      if (chunk.type === 'tool_call') {
        sendSSEEvent(res, 'tool_call', {
          tool: chunk.name,
          args: chunk.args
        });
      } else if (chunk.type === 'tool_progress') {
        sendSSEEvent(res, 'tool_progress', {
          tool: chunk.name,
          message: chunk.message
        });
      } else if (chunk.type === 'tool_result') {
        sendSSEEvent(res, 'tool_result', {
          tool: chunk.name,
          result: chunk.result
        });
      } else if (chunk.type === 'token') {
        fullResponse += chunk.content || '';
        sendSSEEvent(res, 'token', {
          content: chunk.content
        });
      }
    }

    // Add assistant response to history
    sessionStore.addMessage(sessionId, {
      role: 'assistant',
      content: fullResponse
    });

    // Send completion event
    sendSSEEvent(res, 'done', {
      message: 'complete',
      sessionId,
      historyLength: session.messages.length
    });

    res.end();
  } catch (error: any) {
    sendSSEEvent(res, 'error', {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An error occurred during streaming'
    });
    res.end();
  }
});