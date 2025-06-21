# Token Streaming

## Overview
Token streaming provides real-time, character-by-character display of AI responses, creating a more interactive and responsive chat experience.

## Features

### 1. Regular Response Streaming
When the AI responds without using tools, the response streams token by token:
```
Bot: H e l l o !   H o w   c a n   I   h e l p   y o u   t o d a y ?
```
(Displayed progressively, not all at once)

### 2. Tool-Integrated Streaming
When tools are used, the system provides a seamless experience:
1. Tool execution progress streams first
2. AI response based on tool results streams afterward

Example:
```
You: What's the weather in Seoul?
Bot: 
[get_weather] Checking location...
[get_weather] Fetching weather data...
[get_weather] Processing weather information...
[get_weather] Done: Weather in Seoul: 20°C, Clear, Humidity: 55%
The weather in Seoul is currently clear with a temperature of 20°C...
```

## Implementation

### Key Components

1. **OpenAI Streaming API**
   - Uses `stream: true` parameter in chat completions
   - Yields content chunks as they arrive

2. **Async Generators**
   - Both ChatBot and Agent use `async function*` for streaming
   - Yields each chunk of content immediately

3. **Tool Call Handling**
   - Accumulates tool calls during streaming
   - Executes tools after initial response streaming
   - Streams final response after tool execution

### Code Structure
```typescript
async *getStreamingResponse(userInput: string): AsyncGenerator<string, void, unknown> {
  // Stream initial response
  for await (const chunk of stream) {
    yield chunk.content;
  }
  
  // Execute tools if needed
  if (toolCalls.length > 0) {
    // Stream tool execution
    for await (const progress of executeStreamingToolCall(...)) {
      yield progress;
    }
    
    // Stream final response
    for await (const chunk of finalStream) {
      yield chunk.content;
    }
  }
}
```

## Usage

Enable streaming with the `--stream` or `-s` flag:

```bash
# Agent mode with streaming
bun run dev chat --mode agent --stream

# All features enabled
bun run dev chat --mode agent --all
```

## Benefits

1. **Immediate Feedback**: Users see responses as they're generated
2. **Natural Feel**: Mimics human typing patterns
3. **Reduced Perceived Latency**: Content appears faster than waiting for complete response
4. **Tool Transparency**: See exactly when tools are being used
5. **Better Error Handling**: Errors can be displayed immediately

## Performance Considerations

- Streaming adds minimal overhead
- Network latency affects chunk delivery speed
- Tool execution delays are clearly visible
- Memory efficient - doesn't buffer entire response