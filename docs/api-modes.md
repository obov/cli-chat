# API Modes Guide

## Overview

This CLI chatbot supports different OpenAI API modes:

### 1. Chat Completions API (Standard)
```bash
bun run dev chat --mode openai
```
- Traditional stateless API
- You manage conversation history
- Simple and reliable

### 2. Chat Completions API with Streaming
```bash
bun run dev chat --mode openai --stream
```
- Real-time streaming responses
- Shows text as it's generated
- Better user experience for long responses

### 3. Responses API (with store=true)
```bash
bun run dev chat --mode openai --store
```
- Server-side conversation storage (30 days)
- Automatic context management
- New feature in 2025

### 4. Agent Mode (Custom Implementation)
```bash
bun run dev chat --mode agent --tools
```
- Uses function calling for tools
- Supports weather, time, calculations
- Custom agent-like behavior

## Feature Comparison

| Mode | Stateless | Streaming | Tools | Server Storage |
|------|-----------|-----------|-------|----------------|
| Echo | ✓ | ✓ | ✗ | ✗ |
| OpenAI | ✓ | ✓ | ✗ | ✗ |
| OpenAI + store | ✗ | ✓ | ✗ | ✓ |
| Agent | ✓ | ✓ | ✓ | ✗ |

## Examples

### Basic Chat
```bash
bun run dev chat --mode openai
```

### Streaming with Server Storage
```bash
bun run dev chat --mode openai --stream --store
```

### Agent with Tools and Streaming
```bash
bun run dev chat --mode agent --tools --stream
```

## Notes

- OpenAI Agents API is Python-only, so we simulate agent behavior using function calling
- The `--store` flag enables the new Responses API feature
- Streaming works with all OpenAI modes