# CLI Chatbot

A command-line chatbot built with Bun, featuring an AI agent with tool capabilities and streaming support.

## Features

- 🤖 **Agent Mode**: AI assistant with built-in tools
- 🔧 **Tool Support**: Time, weather, and calculation tools
- 📡 **Streaming**: Real-time streaming for both tool execution and responses
- 💬 **Interactive Chat**: Real-time conversation interface
- 🗑️ **Clear History**: Reset conversation with `clear` command
- 🔄 **Echo Mode**: Simple echo bot for testing

## Setup

1. Install dependencies:
```bash
bun install
```

2. Create `.env` file for OpenAI API:
```bash
cp .env.example .env
# Add your OpenAI API key to .env
```

## Usage

### Quick Start
```bash
# Start chat with AI agent (default)
bun run chat

# With streaming
bun run agent:stream

# With all features
bun run agent:all

# Simple echo mode
bun run echo
```

### Command Options
```bash
# Agent mode with specific features
bun run dev chat --mode agent --stream
bun run dev chat -m agent -s

# All features enabled
bun run dev chat --all
bun run dev chat -a

# Echo mode
bun run dev chat --mode echo
```

### Available Tools
The agent has access to these built-in tools:
- `get_current_time` - Get current time in any timezone
- `calculate` - Perform mathematical calculations  
- `get_weather` - Get weather information (mock data)

Tools are automatically used when you ask relevant questions like:
- "What time is it in New York?"
- "Calculate 123 * 456"
- "What's the weather in Seoul?"

### Commands
- Type messages to chat
- `clear` - Clear chat history
- `exit` - Exit the chatbot

## Development

- `bun run dev` - Run in development mode
- `bun run build` - Build for production
- `bun run test` - Run tests

## Configuration

Environment variables in `.env`:
- `OPENAI_API_KEY` - Your OpenAI API key (required for Agent mode)
- `OPENAI_MODEL` - Model to use (default: gpt-4o-mini)
- `OPENAI_TEMPERATURE` - Response creativity (default: 0.7)
- `OPENAI_MAX_TOKENS` - Max response length (default: 1000)