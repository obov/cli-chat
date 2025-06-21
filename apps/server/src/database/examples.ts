#!/usr/bin/env bun
import { SessionStore } from '../sessions';
import { ToolTracker } from './tool-tracker';
import { cleanupOldData } from './index';

// Example usage of SQLite session store

async function examples() {
  console.log('📚 SQLite Session Store Examples\n');

  // 1. Create a new session
  const sessionId = `example-${Date.now()}`;
  const userId = 'user-123';
  
  const store = SessionStore.getInstance();
  const session = store.createSession(sessionId, userId);
  console.log('✅ Created session:', session.id);

  // 2. Add messages
  store.addMessage(sessionId, {
    role: 'user',
    content: 'Hello, what time is it?',
    timestamp: new Date().toISOString()
  });

  store.addMessage(sessionId, {
    role: 'assistant',
    content: 'I\'ll check the current time for you.',
    timestamp: new Date().toISOString()
  });

  // 3. Track tool usage
  ToolTracker.track(
    sessionId,
    'get_current_time',
    { timezone: 'Asia/Seoul' },
    { time: '2025-06-21 12:00:00' },
    125 // execution time in ms
  );

  // 4. Get session with messages
  const retrievedSession = store.getSession(sessionId);
  console.log('\n📋 Retrieved session:');
  console.log('- ID:', retrievedSession?.id);
  console.log('- Messages:', retrievedSession?.messages.length);
  console.log('- Last activity:', retrievedSession?.lastActivity);

  // 5. Get user's sessions
  const userSessions = store.getUserSessions(userId);
  console.log('\n👤 User sessions:', userSessions.length);

  // 6. Get tool usage stats
  const toolStats = ToolTracker.getToolStats();
  console.log('\n📊 Tool usage stats:');
  toolStats.forEach(stat => {
    console.log(`- ${stat.tool_name}: ${stat.usage_count} uses, avg ${stat.avg_execution_time}ms`);
  });

  // 7. Get recent messages
  const recentMessages = store.getRecentMessages(sessionId, 5);
  console.log('\n💬 Recent messages:', recentMessages.length);

  // 8. Clear messages (but keep session)
  store.clearMessages(sessionId);
  console.log('\n🧹 Cleared messages for session');

  // 9. Delete session
  store.deleteSession(sessionId);
  console.log('🗑️  Deleted session');

  // 10. Cleanup old sessions (older than 30 days)
  console.log('\n🧹 Running cleanup...');
  cleanupOldData();
}

// Run examples
examples().catch(console.error);