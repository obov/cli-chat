import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Agent, AgentMessage } from '../agent';
import { SessionStore } from '../sessions';
import { ToolTracker } from '../database/tool-tracker';

interface WSMessage {
  type: 'chat' | 'clear' | 'getHistory' | 'ping' | 'pong' | 'reconnect';
  sessionId?: string;
  message?: string;
  enableTools?: boolean;
}

interface WSResponse {
  type: 'message' | 'token' | 'tool_call' | 'tool_progress' | 'tool_result' | 'history' | 'error' | 'clear' | 'pong' | 'connection' | 'system_message' | 'clear_history';
  content?: string;
  sessionId?: string;
  messages?: any[];
  history?: AgentMessage[];
  tool?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp?: string;
  clientId?: string;
  id?: string;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private sessionStore: SessionStore;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      verifyClient: (info) => {
        // Accept connections from any origin in development
        if (process.env.NODE_ENV === 'development') {
          return true;
        }
        // In production, you might want to check the origin
        const origin = info.origin || info.req.headers.origin;
        console.log(`[WebSocket] Connection attempt from origin: ${origin}`);
        return true;
      }
    });
    this.sessionStore = SessionStore.getInstance();
    this.initializeWebSocket();
  }

  private initializeWebSocket() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const remoteAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      console.log(`[WebSocket] New connection from ${remoteAddress}`);
      console.log(`[WebSocket] User-Agent: ${userAgent}`);
      
      // Parse parameters from query string
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const timezone = url.searchParams.get('tz') || 'UTC';
      const locale = url.searchParams.get('locale') || 'en-US';
      const sessionId = url.searchParams.get('sessionId') || this.generateSessionId();
      
      console.log(`[WebSocket] Client timezone: ${timezone}, locale: ${locale}, sessionId: ${sessionId}`);
      
      // Generate client ID
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      // Store client metadata and session info
      (ws as any).clientMetadata = { timezone, locale };
      (ws as any).sessionId = sessionId;
      console.log(`[WebSocket] Client ${clientId} connected. Total clients: ${this.clients.size}`);

      // Store client ID in WebSocket for later use
      (ws as any).clientId = clientId;

      // Send initial handshake with session info
      this.sendMessage(ws, {
        type: 'connection',
        clientId,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Automatically load session history
      this.loadSessionHistory(ws, sessionId);

      // Handle messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          await this.handleMessage(ws, message, clientId);
        } catch (error) {
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle ping/pong for keep-alive
      ws.on('ping', () => {
        ws.pong();
      });

      // Handle close
      ws.on('close', () => {
        console.log(`[WebSocket] Client ${clientId} disconnected`);
        this.clients.delete(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });
    });
  }

  private async handleMessage(ws: WebSocket, message: WSMessage, clientId: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] WebSocket message from ${clientId}:`, message);

    switch (message.type) {
      case 'chat':
        await this.handleChatMessage(ws, message);
        break;
      
      case 'clear':
        await this.handleClearSession(ws, message);
        break;
      
      case 'getHistory':
        await this.handleGetHistory(ws, message);
        break;
      
      case 'ping':
        this.sendMessage(ws, { type: 'pong', timestamp });
        break;
      
      case 'reconnect':
        // Handle reconnection - reload session history
        const reconnectSessionId = (ws as any).sessionId;
        if (reconnectSessionId) {
          this.loadSessionHistory(ws, reconnectSessionId);
        }
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(ws: WebSocket, message: WSMessage) {
    if (!message.message) {
      this.sendError(ws, 'Message content is required');
      return;
    }

    const sessionId = message.sessionId || (ws as any).sessionId || this.generateSessionId();
    const enableTools = message.enableTools !== false;

    try {
      // Get or create session
      let session = this.sessionStore.getSession(sessionId);
      if (!session) {
        session = this.sessionStore.createSession(sessionId);
      }

      // Add user message to session first
      this.sessionStore.addMessage(sessionId, {
        role: 'user',
        content: message.message,
        timestamp: new Date().toISOString()
      });
      
      // Create agent with session history
      const agent = new Agent(enableTools, true);
      if (session.messages.length > 0) {
        agent.setConversationHistory(session.messages);
      }
      
      // Pass client metadata to agent
      const clientMetadata = (ws as any).clientMetadata;
      if (clientMetadata) {
        agent.setClientMetadata(clientMetadata);
      }

      // Don't send "Using session" message - it clutters the chat

      // Stream response
      for await (const chunk of agent.getStructuredStreamingResponse(message.message)) {
        switch (chunk.type) {
          case 'token':
            this.sendMessage(ws, {
              type: 'token',
              content: chunk.content,
              sessionId
            });
            break;
          
          case 'tool_call':
            // Save tool call message to session with ID
            const toolCallId = `tool-call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.sessionStore.addMessage(sessionId, {
              role: 'system',
              content: `🔧 Calling tool: ${chunk.name}`,
              timestamp: new Date().toISOString(),
              id: toolCallId
            });
            
            // Track tool call start time
            (ws as any).toolStartTime = Date.now();
            (ws as any).currentTool = { name: chunk.name, args: chunk.args };
            
            this.sendMessage(ws, {
              type: 'tool_call',
              tool: chunk.name,
              args: chunk.args,
              sessionId,
              id: toolCallId
            });
            break;
          
          case 'tool_progress':
            // Save tool progress message to session with ID
            const toolProgressId = `tool-prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.sessionStore.addMessage(sessionId, {
              role: 'system',
              content: `⏳ ${chunk.name}: ${chunk.message}`,
              timestamp: new Date().toISOString(),
              id: toolProgressId
            });
            
            this.sendMessage(ws, {
              type: 'tool_progress',
              tool: chunk.name,
              content: chunk.message,
              sessionId,
              id: toolProgressId
            });
            break;
          
          case 'tool_result':
            // Save tool result message to session with ID
            const toolResultId = `tool-res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.sessionStore.addMessage(sessionId, {
              role: 'system',
              content: `✅ Tool result: ${JSON.stringify(chunk.result)}`,
              timestamp: new Date().toISOString(),
              id: toolResultId
            });
            
            // Track tool execution time
            if ((ws as any).toolStartTime && (ws as any).currentTool) {
              const executionTime = Date.now() - (ws as any).toolStartTime;
              ToolTracker.track(
                sessionId,
                (ws as any).currentTool.name,
                (ws as any).currentTool.args,
                chunk.result,
                executionTime
              );
              // Clean up
              delete (ws as any).toolStartTime;
              delete (ws as any).currentTool;
            }
            
            this.sendMessage(ws, {
              type: 'tool_result',
              tool: chunk.name,
              result: chunk.result,
              sessionId,
              id: toolResultId
            });
            break;
        }
      }

      // Get final agent messages
      const agentMessages = agent.getMessages();
      
      // Find and save the assistant's final response and tool messages
      for (const msg of agentMessages) {
        if (msg.role === 'assistant' || msg.role === 'tool') {
          // Check if this message was already saved (by comparing content)
          const existingSession = this.sessionStore.getSession(sessionId);
          const alreadySaved = existingSession?.messages.some(
            m => m.role === msg.role && m.content === msg.content && m.tool_call_id === msg.tool_call_id
          );
          
          if (!alreadySaved) {
            this.sessionStore.addMessage(sessionId, msg);
          }
        }
      }

    } catch (error: any) {
      console.error('[WebSocket] Chat error:', error);
      this.sendError(ws, error.message || 'Failed to process chat message');
    }
  }

  private async handleClearSession(ws: WebSocket, message: WSMessage) {
    const sessionId = message.sessionId;
    if (!sessionId) {
      this.sendError(ws, 'Session ID is required');
      return;
    }

    // Use clearMessages method from SessionStore
    this.sessionStore.clearMessages(sessionId);

    this.sendMessage(ws, {
      type: 'clear',
      sessionId,
      content: 'Chat history cleared'
    });
  }

  private async handleGetHistory(ws: WebSocket, message: WSMessage) {
    const sessionId = message.sessionId;
    if (!sessionId) {
      this.sendError(ws, 'Session ID is required');
      return;
    }

    const session = this.sessionStore.getSession(sessionId);
    const messages = session ? session.messages.filter(msg => msg.role !== 'system') : [];

    this.sendMessage(ws, {
      type: 'history',
      sessionId,
      history: messages
    });
  }

  private sendMessage(ws: WebSocket, response: WSResponse) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(response));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.sendMessage(ws, {
      type: 'error',
      error,
      timestamp: new Date().toISOString()
    });
  }

  private generateClientId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadSessionHistory(ws: WebSocket, sessionId: string) {
    const session = this.sessionStore.getSession(sessionId);
    
    if (session && session.messages.length > 0) {
      
      // Send all messages in a single history event with unique IDs
      const messagesWithIds = session.messages.map((msg, index) => ({
        ...msg,
        id: `${sessionId}-${index}-${Date.now()}`
      }));
      
      this.sendMessage(ws, {
        type: 'history',
        messages: messagesWithIds,
        sessionId,
        timestamp: new Date().toISOString()
      });
    } else {
    }
  }

  // Broadcast to all connected clients
  public broadcast(message: WSResponse) {
    this.clients.forEach((ws) => {
      this.sendMessage(ws, message);
    });
  }

  // Send to specific client
  public sendToClient(clientId: string, message: WSResponse) {
    const ws = this.clients.get(clientId);
    if (ws) {
      this.sendMessage(ws, message);
    }
  }
}