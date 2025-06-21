import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { chatRouter } from './routes/chat';
import { toolsRouter } from './routes/tools';
import { healthRouter } from './routes/health';
import { streamRouter } from './routes/stream';
import { errorHandler } from './middleware/error-handler';
import { SessionStore } from './sessions/session-store';
import { WebSocketManager } from './websocket/ws-server';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  
  console.log(`\n[${timestamp}] ${req.method} ${req.path}`);
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', req.query);
  }
  
  // Log body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Log response
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`Response: ${res.statusCode} - ${duration}ms`);
    return originalSend.call(this, data);
  };
  
  next();
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'cli-chatbot-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// Initialize session store
SessionStore.getInstance();

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/chat/stream', streamRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/health', healthRouter);

// Error handling
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wsManager = new WebSocketManager(server);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('📡 Available endpoints:');
  console.log(`   POST   /api/chat`);
  console.log(`   GET    /api/chat/stream`);
  console.log(`   POST   /api/chat/stream`);
  console.log(`   GET    /api/tools`);
  console.log(`   DELETE /api/chat/sessions/:id`);
  console.log(`   GET    /api/health`);
  console.log(`   WS     /ws (WebSocket endpoint)`);
});

export default app;
export { wsManager };