# Complete Implementation Plan: CLI → Server

## Phase 1: CLI Tool Calling Streaming Enhancement

### 1.1 Streaming Tool Executor Support
- Modify `tool-manager.ts`:
  - Add `StreamingToolExecutor` type for async generators
  - Update `registerTool` to detect executor type
  - Enhance `executeTool` to handle streaming results
- Keep backward compatibility with existing tools

### 1.2 Update Existing Tools for Streaming
- Convert tools to show progress:
  - `get_weather`: "Checking location..." → "Fetching weather data..." → Result
  - `calculate`: "Parsing expression..." → "Computing..." → Result
  - `get_current_time`: "Getting timezone info..." → Result

### 1.3 CLI Response Streaming with Tool Calls
- Enhance `chatbot.ts` and `agent.ts`:
  - Stream tool execution progress in real-time
  - Format: `[get_weather] Checking location...` → `[get_weather] Fetching...` → `[get_weather] Done: 21°C`
  - Seamlessly integrate with token-by-token response streaming

## Phase 2: CLI Token Streaming in Tool Mode

### 2.1 Token-by-Token Streaming After Tool Calls
- When tools are executed, ensure the AI response streams token-by-token
- Current behavior: Tool executes → Full response returned
- Target behavior: Tool executes → Response streams character by character

### 2.2 Unified Streaming Experience
- Combine tool progress streaming with response token streaming
- Example flow:
  ```
  [get_weather] Checking location...
  [get_weather] Fetching weather data...
  [get_weather] Done: 21°C, Clear
  The weather in Seoul is currently 21°C with clear skies...
  ```
  - The final AI response should stream token-by-token

## Phase 3: Express Server - REST API

### 3.1 Basic Server Setup
- Create `src/server.ts` with Express
- Endpoints:
  - `POST /api/chat` - Synchronous chat
  - `GET /api/tools` - List available tools
  - `DELETE /api/sessions/:id` - Clear session
  - `GET /api/health` - Health check

### 3.2 Session Management
- In-memory session store (Redis later)
- Maintain conversation history per session
- Session timeout handling

## Phase 4: Server-Sent Events (SSE)

### 4.1 Streaming Endpoint
- `GET /api/chat/stream` endpoint
- Event types:
  ```
  event: token
  data: {"content": "The"}
  
  event: tool_call
  data: {"tool": "get_weather", "args": {"location": "Seoul"}}
  
  event: tool_progress
  data: {"tool": "get_weather", "message": "Fetching weather data..."}
  
  event: tool_result
  data: {"tool": "get_weather", "result": "21°C, Clear"}
  
  event: done
  data: {"message": "complete"}
  ```

## Phase 5: WebSocket Implementation

### 5.1 WebSocket Server
- Add Socket.io or ws
- Room-based sessions
- Events:
  - Client → Server: `chat.message`, `chat.clear`, `tools.list`
  - Server → Client: `chat.token`, `tool.call`, `tool.progress`, `tool.result`, `chat.complete`

### 5.2 Enhanced Features
- Real-time tool cancellation
- Multiple concurrent tool executions
- Progress percentage for long-running tools

## Implementation Order:
1. **Phase 1**: CLI streaming tools - Tool execution progress
2. **Phase 2**: CLI token streaming in tool mode - Response streaming after tools
3. **Phase 3**: Basic Express server - REST endpoints
4. **Phase 4**: SSE implementation - Server-side streaming
5. **Phase 5**: WebSocket upgrade - Full duplex communication

## CLI Development First (Phase 1-2)
Complete all CLI enhancements before moving to server:
- Tool execution streaming
- Token-by-token response streaming in tool mode
- Test thoroughly with all tools
- Ensure smooth user experience

## File Structure:
```
src/
├── cli/              # Current CLI code
├── server/
│   ├── index.ts      # Express server
│   ├── routes/       # API routes
│   ├── middleware/   # Auth, error handling
│   ├── sessions/     # Session management
│   └── websocket/    # Socket.io handlers
└── shared/           # Shared tools, types
```

## Key Technical Decisions

### Tool Streaming Architecture
- Maintain backward compatibility with sync tools
- Use async generators for progressive updates
- Unified streaming interface across CLI/REST/SSE/WS

### Session Management
- Start with in-memory store for simplicity
- Design for horizontal scaling (Redis ready)
- Session ID in headers/cookies/query params

### Error Handling Strategy
- Graceful degradation (streaming → sync fallback)
- Tool-specific error messages
- Client retry logic with exponential backoff

### Performance Considerations
- Stream buffering for optimal chunk sizes
- Connection pooling for external APIs
- Response caching for repeated queries

## Summary
1. **CLI First**: Complete Phase 1-2 for full CLI streaming capabilities
2. **Then Server**: Move to Phase 3-5 for server implementation
3. **No Production Phase**: Focus on core functionality first