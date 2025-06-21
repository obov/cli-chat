import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { Agent, AgentMessage } from '../agent';
import { SessionStore } from '../sessions';

interface WSMessage {
  type: 'chat' | 'clear' | 'getHistory' | 'ping' | 'pong';
  sessionId?: string;
  message?: string;
  enableTools?: boolean;
}

interface WSResponse {
  type: 'message' | 'token' | 'tool_call' | 'tool_progress' | 'tool_result' | 'history' | 'error' | 'clear' | 'pong';
  content?: string;
  sessionId?: string;
  history?: AgentMessage[];
  tool?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp?: string;
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
      
      // Parse timezone and locale from query parameters
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const timezone = url.searchParams.get('tz') || 'UTC';
      const locale = url.searchParams.get('locale') || 'en-US';
      console.log(`[WebSocket] Client timezone: ${timezone}, locale: ${locale}`);
      
      // Generate client ID
      const clientId = this.generateClientId();
      this.clients.set(clientId, ws);
      
      // Store client metadata
      (ws as any).clientMetadata = { timezone, locale };
      console.log(`[WebSocket] Client ${clientId} connected. Total clients: ${this.clients.size}`);

      // Send welcome message
      this.sendMessage(ws, {
        type: 'message',
        content: 'Connected to ChatBot WebSocket server',
        timestamp: new Date().toISOString()
      });

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
      
      default:
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  private async handleChatMessage(ws: WebSocket, message: WSMessage) {
    if (!message.message) {
      this.sendError(ws, 'Message content is required');
      return;
    }

    const sessionId = message.sessionId || this.generateSessionId();
    const enableTools = message.enableTools !== false;

    try {
      // Get or create session
      let session = this.sessionStore.getSession(sessionId);
      if (!session) {
        session = this.sessionStore.createSession(sessionId);
      }

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

      // Send session ID
      this.sendMessage(ws, {
        type: 'message',
        sessionId,
        content: `Using session: ${sessionId}`
      });

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
            this.sendMessage(ws, {
              type: 'tool_call',
              tool: chunk.name,
              args: chunk.args,
              sessionId
            });
            break;
          
          case 'tool_progress':
            this.sendMessage(ws, {
              type: 'tool_progress',
              tool: chunk.name,
              content: chunk.message,
              sessionId
            });
            break;
          
          case 'tool_result':
            this.sendMessage(ws, {
              type: 'tool_result',
              tool: chunk.name,
              result: chunk.result,
              sessionId
            });
            break;
        }
      }

      // Update session
      const messages = agent.getMessages();
      this.sessionStore.updateSession(sessionId, messages);

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