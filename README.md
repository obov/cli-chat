# CLI Chatbot

A command-line chatbot built with Bun, supporting echo mode, OpenAI integration, and advanced agent capabilities.

## Features

- 🔄 **Echo Mode**: Simple echo bot for testing
- 🤖 **OpenAI Mode**: AI-powered responses using GPT models
- 🤖 **Agent Mode**: Advanced AI with tool usage and streaming
- 🔧 **Tool Support**: Time, weather, calculations in agent mode
- 📡 **Streaming**: Real-time streaming responses
- 💬 **Interactive Chat**: Real-time conversation interface
- 🗑️ **Clear History**: Reset conversation with `clear` command

## Setup

1. Install dependencies:
```bash
bun install
```

2. For OpenAI/Agent modes, create `.env` file:
```bash
cp .env.example .env
# Add your OpenAI API key to .env
```

## Usage

### Echo Mode (default)
```bash
bun run dev chat
# or
bun run dev chat --mode echo
```

### OpenAI Mode
```bash
# Basic OpenAI mode
bun run dev chat --mode openai

# OpenAI with tools (weather, time, calculations)
bun run dev chat --mode openai --tools

# OpenAI with streaming and server storage
bun run dev chat --mode openai --stream --store

# All features combined
bun run dev chat --mode openai --tools --stream --store
```

### Agent Mode
```bash
# Basic agent
bun run dev chat --mode agent

# Agent with tools
bun run dev chat --mode agent --tools

# Agent with streaming
bun run dev chat --mode agent --stream

# Agent with both tools and streaming
bun run dev chat --mode agent --tools --stream
```

### Available Tools (Agent Mode)
- `get_current_time` - Get current time in any timezone
- `calculate` - Perform mathematical calculations
- `get_weather` - Get weather information (mock data)

### Commands
- Type messages to chat
- `clear` - Clear chat history
- `exit` - Exit the chatbot

## Development

- `bun run dev` - Run in development mode
- `bun run build` - Build for production
- `bun run test` - Run basic tests
- `bun run tests/agent.test.ts` - Run agent tool tests

## Configuration

Environment variables in `.env`:
- `OPENAI_API_KEY` - Your OpenAI API key (required for OpenAI/Agent modes)
- `OPENAI_MODEL` - Model to use (default: gpt-4.1-nano)
- `OPENAI_TEMPERATURE` - Response creativity (default: 0.7)
- `OPENAI_MAX_TOKENS` - Max response length (default: 1000)