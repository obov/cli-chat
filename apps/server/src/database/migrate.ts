#!/usr/bin/env bun
import { db, sessionStatements, messageStatements } from './index';
import { SessionStore as MemorySessionStore } from '../sessions/session-store';

console.log('🔄 Starting migration from memory to SQLite...');

// Get the memory session store instance
const memoryStore = MemorySessionStore.getInstance();

// Get all sessions from memory store (requires adding a method to get all sessions)
// For now, we'll just log that this needs to be done manually

console.log(`
⚠️  Note: Existing sessions in memory will be lost when the server restarts.
   
   To preserve existing sessions:
   1. Export them before shutting down the server
   2. Import them after starting with SQLite

✅ SQLite database initialized at: data/chatbot.db

Database tables created:
- sessions: Store chat sessions
- messages: Store all messages
- tool_usage: Track tool execution analytics

Indexes created for optimal performance.
`);

// Test database connection
try {
  const testSession = 'test-' + Date.now();
  sessionStatements.create.run(testSession, 'test-user', '{}');
  sessionStatements.delete.run(testSession);
  console.log('✅ Database connection test successful');
} catch (error) {
  console.error('❌ Database connection test failed:', error);
  process.exit(1);
}