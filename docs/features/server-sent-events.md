# Server-Sent Events (SSE)

## Overview
Server-Sent Events provide real-time streaming of chat responses and tool executions from the server to the client. This enables a more interactive experience where users can see responses being generated token-by-token and observe tool execution progress in real-time.

## Endpoints

### GET `/api/chat/stream`
Stream chat responses using query parameters.

**Query Parameters:**
- `message` (required): The chat message
- `sessionId` (optional): Session identifier for conversation persistence
- `enableTools` (optional): Enable/disable tool usage (default: true)

**Example:**
```bash
curl -N "http://localhost:3002/api/chat/stream?message=What%20is%20the%20weather%20in%20Seoul%3F&enableTools=true"
```

### POST `/api/chat/stream`
Stream chat responses using request body (useful for complex messages).

**Request Body:**
```json
{
  "message": "What's the weather in Seoul?",
  "sessionId": "user-123",
  "enableTools": true
}
```

**Example:**
```bash
curl -N -X POST http://localhost:3002/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Calculate 123 * 456"}'
```

## Event Types

### 1. `token`
Emitted for each token in the AI response.

```
event: token
data: {"content": "The"}

event: token
data: {"content": " weather"}

event: token
data: {"content": " in"}
```

### 2. `tool_call`
Emitted when the AI decides to use a tool.

```
event: tool_call
data: {"tool": "get_weather", "args": {"location": "Seoul"}}
```

### 3. `tool_progress`
Emitted during tool execution to show progress.

```
event: tool_progress
data: {"tool": "get_weather", "message": "Checking location..."}

event: tool_progress
data: {"tool": "get_weather", "message": "Fetching weather data..."}
```

### 4. `tool_result`
Emitted when tool execution completes.

```
event: tool_result
data: {"tool": "get_weather", "result": "Temperature: 20°C, Condition: Clear, Humidity: 55%"}
```

### 5. `done`
Emitted when the entire response is complete.

```
event: done
data: {"message": "complete", "sessionId": "user-123", "historyLength": 4}
```

### 6. `error`
Emitted when an error occurs.

```
event: error
data: {"code": "INTERNAL_ERROR", "message": "Failed to process request"}
```

## Client Implementation

### JavaScript/TypeScript with EventSource

```javascript
const eventSource = new EventSource('http://localhost:3002/api/chat/stream?message=Hello');

let responseBuffer = '';

// Handle tokens
eventSource.addEventListener('token', (event) => {
  const data = JSON.parse(event.data);
  responseBuffer += data.content;
  // Update UI with streaming content
  updateChatUI(data.content);
});

// Handle tool calls
eventSource.addEventListener('tool_call', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Calling tool: ${data.tool}`);
});

// Handle tool progress
eventSource.addEventListener('tool_progress', (event) => {
  const data = JSON.parse(event.data);
  updateToolStatus(data.tool, data.message);
});

// Handle completion
eventSource.addEventListener('done', (event) => {
  const data = JSON.parse(event.data);
  console.log('Response complete');
  eventSource.close();
});

// Handle errors
eventSource.addEventListener('error', (event) => {
  console.error('SSE Error:', event);
  eventSource.close();
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';

function useSSEChat(message: string, sessionId?: string) {
  const [response, setResponse] = useState('');
  const [toolStatus, setToolStatus] = useState<Record<string, string>>({});
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!message) return;

    const params = new URLSearchParams({
      message,
      ...(sessionId && { sessionId })
    });

    const eventSource = new EventSource(
      `http://localhost:3002/api/chat/stream?${params}`
    );

    eventSource.addEventListener('token', (event) => {
      const data = JSON.parse(event.data);
      setResponse(prev => prev + data.content);
    });

    eventSource.addEventListener('tool_progress', (event) => {
      const data = JSON.parse(event.data);
      setToolStatus(prev => ({
        ...prev,
        [data.tool]: data.message
      }));
    });

    eventSource.addEventListener('done', () => {
      setIsComplete(true);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [message, sessionId]);

  return { response, toolStatus, isComplete };
}
```

## Session Management

SSE endpoints integrate with the session management system:

1. Sessions are created automatically if not provided
2. Conversation history is maintained across requests
3. Use the same `sessionId` to continue conversations
4. Sessions expire after 24 hours of inactivity

## Error Handling

The SSE stream will emit an error event and close the connection if:
- Missing required parameters
- Server errors during processing
- Session not found (for explicit session IDs)

## Performance Considerations

1. **Connection Limits**: Browsers typically limit SSE connections to 6 per domain
2. **Keep-Alive**: The server maintains connections with keep-alive headers
3. **Buffering**: Responses are streamed immediately without buffering
4. **Compression**: Consider enabling gzip for text/event-stream responses

## Testing

Use the provided test script to verify SSE functionality:

```bash
npx ts-node tests/sse-client.test.ts
```

This will test:
- Basic streaming responses
- Tool calling and progress updates
- Session persistence
- Error handling

## Browser Compatibility

SSE is supported in all modern browsers:
- Chrome 6+
- Firefox 6+
- Safari 5+
- Edge 79+

For older browsers or IE, consider using a polyfill or fallback to regular polling.