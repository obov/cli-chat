# Streaming Tool Execution

## Overview
The streaming tool execution feature provides real-time progress updates when tools are being executed, enhancing the user experience by showing what's happening during tool calls.

## How It Works

### Architecture
1. **StreamingToolExecutor**: A new async generator type that yields progress updates
2. **ToolManager Enhancement**: Detects and handles both regular and streaming executors
3. **CLI Integration**: Both ChatBot and Agent classes support streaming tool execution

### Implementation Details

#### Tool Registration
Tools can now be registered as async generators:
```typescript
async function* (args: any) {
  yield '[tool_name] Starting...';
  // Processing logic
  yield '[tool_name] Processing...';
  // Final result
  yield '[tool_name] Done: result';
  return 'result';
}
```

#### Execution Flow
1. User asks a question that requires a tool
2. AI decides to use a tool and calls it
3. Tool execution progress is streamed in real-time
4. Final result is captured and sent back to the AI
5. AI generates a response based on the tool result

## Available Tools

### get_current_time
Shows timezone retrieval and formatting progress:
```
[get_current_time] Getting timezone info...
[get_current_time] Formatting date...
[get_current_time] Done: Saturday, June 21, 2025 at 02:03:35 AM UTC
```

### calculate
Shows expression parsing and computation progress:
```
[calculate] Parsing expression...
[calculate] Computing result...
[calculate] Done: 123 * 456 = 56088
```

### get_weather
Shows location checking and data fetching progress:
```
[get_weather] Checking location...
[get_weather] Fetching weather data...
[get_weather] Processing weather information...
[get_weather] Done: Weather in Seoul: 20°C, Clear, Humidity: 55%
```

## Usage

### Agent Mode (Recommended)
```bash
bun run dev chat --mode agent --stream
```
- Tools are enabled by default
- Full streaming support for both tools and responses

### OpenAI Mode (Legacy)
```bash
bun run dev chat --mode openai --tools --stream
```
- Requires explicit `--tools` flag
- Same streaming capabilities but less integrated

## Benefits
1. **User Feedback**: Users see what's happening during tool execution
2. **Transparency**: Clear indication of which tool is being used
3. **Better UX**: No more waiting without feedback during long operations
4. **Debugging**: Easier to identify where issues occur in tool execution

## Technical Notes
- Backward compatible with non-streaming tools
- Simulated delays added for demonstration (can be removed in production)
- Final results are extracted from the "Done:" message pattern
- Error handling preserves streaming experience