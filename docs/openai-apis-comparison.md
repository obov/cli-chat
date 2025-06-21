# OpenAI APIs Comparison: Chat Completions vs Agents/Responses API

## Overview

OpenAI offers multiple APIs for different use cases. This document compares the traditional **Chat Completions API** with the newer **Agents API** (and the upcoming **Responses API**).

## Chat Completions API

### Description
The Chat Completions API is OpenAI's standard API for generating text responses. It's the industry-standard approach that many other AI providers have also adopted.

### Key Characteristics
- **Stateless**: Requires client-side conversation history management
- **Synchronous**: Direct request-response pattern
- **Simple**: Straightforward implementation with minimal setup
- **Manual context**: You must send the full conversation history with each request

### Code Example
```python
from openai import OpenAI

client = OpenAI()

# You must maintain conversation history yourself
messages = [
    {"role": "user", "content": "What city is the Golden Gate Bridge in?"},
    {"role": "assistant", "content": "The Golden Gate Bridge is in San Francisco."},
    {"role": "user", "content": "What state is that in?"}  # Must include previous context
]

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages
)

print(response.choices[0].message.content)
```

### When to Use
- Simple Q&A applications
- One-off text generation tasks
- When you need full control over conversation history
- Integration with existing systems that expect this format

## Agents API

### Description
The OpenAI Agents SDK enables building agentic AI apps with a lightweight, production-ready framework. It's an evolution of their previous "Swarm" experimentation.

### Key Characteristics
- **Stateful**: Can manage conversation state server-side
- **Agent-oriented**: Built around the concept of specialized agents
- **Tool support**: Native support for function calling and tools
- **Handoffs**: Agents can delegate tasks to other specialized agents
- **Guardrails**: Built-in input validation
- **Tracing**: Integrated debugging and monitoring

### Code Example

#### Basic Usage
```python
from agents import Agent, Runner

# Create an agent
agent = Agent(
    name="Assistant", 
    instructions="You are a helpful assistant"
)

# Run synchronously
result = Runner.run_sync(agent, "Write a haiku about recursion")
print(result.final_output)
```

#### Multi-Agent Example with Handoffs
```python
from agents import Agent, Runner
import asyncio

# Create specialized agents
spanish_agent = Agent(
    name="Spanish agent",
    instructions="You only speak Spanish.",
)

english_agent = Agent(
    name="English agent",
    instructions="You only speak English",
)

# Create a triage agent that can hand off to others
triage_agent = Agent(
    name="Triage agent",
    instructions="Handoff to the appropriate agent based on the language of the request.",
    handoffs=[spanish_agent, english_agent],
)

# Run asynchronously
async def main():
    result = await Runner.run(triage_agent, input="Hola, ¿cómo estás?")
    print(result.final_output)
    # Output: ¡Hola! Estoy bien, gracias por preguntar. ¿Y tú, cómo estás?

asyncio.run(main())
```

#### Stateful Conversation Example
```python
async def main():
    agent = Agent(name="Assistant", instructions="Reply very concisely.")
    
    # First turn
    result = await Runner.run(agent, "What city is the Golden Gate Bridge in?")
    print(result.final_output)  # San Francisco
    
    # Second turn - maintains context
    new_input = result.to_input_list() + [{"role": "user", "content": "What state is it in?"}]
    result = await Runner.run(agent, new_input)
    print(result.final_output)  # California
```

### When to Use
- Complex multi-step workflows
- Applications requiring specialized agents for different tasks
- When you need server-side conversation state management
- Projects requiring tool use, code execution, or function calling
- Systems that benefit from agent handoffs and delegation

## Responses API (New in 2025)

### Description
A new API that combines the simplicity of Chat Completions with enhanced features like server-side state management.

### Key Features
- **State management**: Optional server-side conversation storage with `store: true`
- **Built-in tools**: Web search, file search, computer use (sandboxed)
- **Backwards compatible**: Supports existing Chat Completions format
- **Form encoding**: Supports HTML form encoding for requests

### Code Example
```python
from openai import OpenAI

client = OpenAI()

# Enable server-side storage
response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
    store=True  # Enable response storage for 30 days
)
```

### Important Note
The Assistants API will be sunset in the first half of 2026, with the Responses API as its replacement.

## Key Differences Summary

| Feature | Chat Completions | Agents API | Responses API |
|---------|-----------------|------------|---------------|
| State Management | Client-side | Server-side | Optional server-side |
| Complexity | Simple | Moderate | Simple |
| Setup Required | Minimal | More involved | Minimal |
| Tool Support | Function calling | Full tool support | Built-in tools |
| Multi-agent | No | Yes (handoffs) | No |
| Conversation Context | Manual | Automatic | Optional automatic |
| Processing | Synchronous | Async/Sync | Synchronous |
| Industry Standard | Yes | No | Extending standard |

## Recommendations

1. **Use Chat Completions API when:**
   - Building simple chatbots or Q&A systems
   - You need industry-standard compatibility
   - You want full control over conversation history
   - Integration with existing systems is important

2. **Use Agents API when:**
   - Building complex agentic workflows
   - You need multiple specialized agents
   - Tool use and function calling are critical
   - You want built-in tracing and debugging
   - Agent handoffs would simplify your architecture

3. **Consider Responses API when:**
   - You want Chat Completions simplicity with state management
   - You need built-in tools like web search
   - You're currently using Assistants API (which will be deprecated)

## Migration Notes

- OpenAI states they will "continue supporting [Chat Completions API] indefinitely"
- Assistants API will be sunset in H1 2026
- Responses API aims to be the best of both worlds

## Installation

```bash
# For Chat Completions and Responses API
pip install openai

# For Agents API
pip install openai-agents

# For Agents API with voice support
pip install 'openai-agents[voice]'
```

## Additional Resources

- [OpenAI Agents SDK Documentation](https://openai.github.io/openai-agents-python/)
- [OpenAI Agents GitHub Repository](https://github.com/openai/openai-agents-python)
- [OpenAI Platform Documentation](https://platform.openai.com/docs/)
- [Practical Guide to Building Agents (PDF)](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)