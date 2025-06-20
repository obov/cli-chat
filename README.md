# CLI Chatbot

A command-line chatbot built with Bun, supporting both echo mode and OpenAI integration.

## Features

- 🔄 **Echo Mode**: Simple echo bot for testing
- 🤖 **OpenAI Mode**: AI-powered responses using GPT models
- 💬 **Interactive Chat**: Real-time conversation interface
- 🗑️ **Clear History**: Reset conversation with `clear` command

## Setup

1. Install dependencies:
```bash
bun install
```

2. For OpenAI mode, create `.env` file:
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
bun run dev chat --mode openai
```

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
- `OPENAI_API_KEY` - Your OpenAI API key (required for OpenAI mode)
- `OPENAI_MODEL` - Model to use (default: gpt-3.5-turbo)
- `OPENAI_TEMPERATURE` - Response creativity (default: 0.7)
- `OPENAI_MAX_TOKENS` - Max response length (default: 1000)