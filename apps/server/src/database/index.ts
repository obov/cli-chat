import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Database file path - stored in project root data directory
const DB_PATH = join(process.cwd(), 'data', 'chatbot.db');

// Create data directory if it doesn't exist
import { mkdirSync } from 'fs';
mkdirSync(join(process.cwd(), 'data'), { recursive: true });

// Initialize database
export const db = new Database(DB_PATH, { create: true });

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON');

// Initialize schema
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Prepared statements for sessions
export const sessionStatements = {
  create: db.prepare(`
    INSERT INTO sessions (id, user_id, metadata) 
    VALUES (?, ?, ?)
  `),
  
  get: db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `),
  
  update: db.prepare(`
    UPDATE sessions 
    SET last_activity = CURRENT_TIMESTAMP 
    WHERE id = ?
  `),
  
  delete: db.prepare(`
    DELETE FROM sessions WHERE id = ?
  `),
  
  getByUser: db.prepare(`
    SELECT * FROM sessions 
    WHERE user_id = ? 
    ORDER BY last_activity DESC
  `),
  
  cleanup: db.prepare(`
    DELETE FROM sessions 
    WHERE last_activity < datetime('now', '-30 days')
  `)
};

// Prepared statements for messages
export const messageStatements = {
  create: db.prepare(`
    INSERT INTO messages (session_id, role, content, tool_calls, tool_call_id) 
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getBySession: db.prepare(`
    SELECT * FROM messages 
    WHERE session_id = ? 
    ORDER BY timestamp ASC
  `),
  
  deleteBySession: db.prepare(`
    DELETE FROM messages WHERE session_id = ?
  `),
  
  getRecent: db.prepare(`
    SELECT * FROM messages 
    WHERE session_id = ? 
    ORDER BY timestamp DESC 
    LIMIT ?
  `)
};

// Prepared statements for tool usage
export const toolStatements = {
  create: db.prepare(`
    INSERT INTO tool_usage (session_id, tool_name, args, result, execution_time_ms) 
    VALUES (?, ?, ?, ?, ?)
  `),
  
  getBySession: db.prepare(`
    SELECT * FROM tool_usage 
    WHERE session_id = ? 
    ORDER BY created_at DESC
  `),
  
  getStats: db.prepare(`
    SELECT 
      tool_name, 
      COUNT(*) as usage_count,
      AVG(execution_time_ms) as avg_execution_time
    FROM tool_usage 
    GROUP BY tool_name 
    ORDER BY usage_count DESC
  `)
};

// Transaction helper
export function transaction<T>(fn: () => T): T {
  return db.transaction(fn).deferred();
}

// Cleanup old data (can be run periodically)
export function cleanupOldData() {
  const deleted = sessionStatements.cleanup.run();
  console.log(`Cleaned up ${deleted.changes} old sessions`);
}

// Close database on exit
process.on('exit', () => db.close());
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

export default db;