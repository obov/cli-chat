import OpenAI from 'openai';
import { config } from './config';
import { availableTools, executeToolCall, executeStreamingToolCall, Tool, ToolCall } from './tools';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export class Agent {
  private openai: OpenAI | null = null;
  private messages: AgentMessage[] = [];
  private tools: Tool[];
  private streamMode: boolean;

  constructor(enableTools: boolean = true, streamMode: boolean = false) {
    this.tools = enableTools ? availableTools : [];
    this.streamMode = streamMode;
    
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
      
      // Add system message with tool awareness
      const systemMessage = enableTools
        ? 'You are a helpful AI assistant with access to various tools. You MUST use these tools when users ask for information that the tools can provide. For example: use get_weather when asked about weather, use get_current_time when asked about time, use calculate for math problems. Always use the appropriate tool rather than saying you cannot help.'
        : 'You are a helpful AI assistant.';
        
      this.messages.push({
        role: 'system',
        content: systemMessage,
      });
    }
  }

  async getResponse(userInput: string): Promise<string> {
    if (!this.openai) {
      return 'Error: OpenAI client not initialized';
    }

    try {
      // Add user message
      this.messages.push({ role: 'user', content: userInput });

      // Create chat completion with tools
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages as any,
        tools: this.tools.length > 0 ? this.tools : undefined,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      });

      const message = completion.choices[0]?.message;
      
      if (!message) {
        return 'No response from AI';
      }

      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        this.messages.push({
          role: 'assistant',
          content: message.content,
          tool_calls: message.tool_calls as ToolCall[],
        });

        // Execute tool calls
        for (const toolCall of message.tool_calls) {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args);
          
          // Add tool result to messages
          this.messages.push({
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          });
        }

        // Get final response after tool execution
        const finalCompletion = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: this.messages as any,
          temperature: config.openai.temperature,
          max_tokens: config.openai.maxTokens,
        });

        const finalMessage = finalCompletion.choices[0]?.message?.content || 'No response';
        this.messages.push({ role: 'assistant', content: finalMessage });
        
        return finalMessage;
      } else {
        // Regular response without tools
        const responseContent = message.content || 'No response';
        this.messages.push({ role: 'assistant', content: responseContent });
        return responseContent;
      }
    } catch (error) {
      console.error('Agent Error:', error);
      return 'Error: Failed to get response from agent';
    }
  }

  async *getStreamingResponse(userInput: string): AsyncGenerator<string, void, unknown> {
    if (!this.openai) {
      yield 'Error: OpenAI client not initialized';
      return;
    }

    try {
      this.messages.push({ role: 'user', content: userInput });

      const stream = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages as any,
        tools: this.tools.length > 0 ? this.tools : undefined,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
        stream: true,
      });

      let fullResponse = '';
      let toolCalls: any[] = [];
      
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Handle tool calls in streaming
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: "",
                  type: "function",
                  function: { name: "", arguments: "" }
                };
              }
              
              const toolCall = toolCalls[toolCallDelta.index];
              if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) toolCall.function.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments) {
                toolCall.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }
        
        // Handle regular content
        const content = delta?.content || '';
        fullResponse += content;
        if (content) yield content;
      }

      // If tool calls were made, execute them
      if (toolCalls.length > 0) {
        this.messages.push({
          role: 'assistant',
          content: fullResponse || null,
          tool_calls: toolCalls,
        });

        // Execute tools with streaming
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Stream tool execution progress
            let fullResult = '';
            for await (const chunk of executeStreamingToolCall(toolCall.function.name, args)) {
              yield `\n${chunk}`;
              
              // Capture the final result
              if (chunk.includes(' Done: ')) {
                const match = chunk.match(/\[.*?\] Done: (.*)$/);
                if (match) {
                  fullResult = match[1];
                }
              }
            }
            
            // If we didn't capture a result, use the last chunk
            if (!fullResult) {
              fullResult = await executeToolCall(toolCall.function.name, args);
            }
            
            this.messages.push({
              role: 'tool',
              content: fullResult,
              tool_call_id: toolCall.id,
            });
            
            yield '\n';
          } catch (error) {
            yield `\n[Error]: ${error}\n`;
          }
        }

        // Get final response after tool execution
        const finalStream = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: this.messages as any,
          temperature: config.openai.temperature,
          max_tokens: config.openai.maxTokens,
          stream: true,
        });

        let finalResponse = '';
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          finalResponse += content;
          yield content;
        }
        
        this.messages.push({ role: 'assistant', content: finalResponse });
      } else {
        // No tool calls, just save the response
        this.messages.push({ role: 'assistant', content: fullResponse });
      }
    } catch (error) {
      console.error('Streaming Error:', error);
      yield 'Error: Failed to get streaming response';
    }
  }

  clearHistory() {
    this.messages = this.messages.filter(msg => msg.role === 'system');
  }

  setConversationHistory(messages: AgentMessage[]) {
    // Keep system message and set new conversation history
    const systemMessage = this.messages.find(msg => msg.role === 'system');
    this.messages = systemMessage ? [systemMessage, ...messages] : messages;
  }

  getAvailableTools(): string[] {
    return this.tools.map(tool => tool.function.name);
  }

  // New method for SSE streaming that returns structured chunks
  async *getStreamingResponse(message: string): AsyncGenerator<{
    type: 'token' | 'tool_call' | 'tool_progress' | 'tool_result';
    content?: string;
    name?: string;
    args?: any;
    message?: string;
    result?: any;
  }> {
    this.messages.push({ role: 'user', content: message });

    try {
      const stream = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: this.messages,
        tools: this.enableTools ? this.tools : undefined,
        tool_choice: this.enableTools ? 'auto' : undefined,
        stream: true,
      });

      let fullResponse = '';
      const toolCalls: any[] = [];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        
        // Handle tool calls in streaming
        if (delta?.tool_calls) {
          for (const toolCallDelta of delta.tool_calls) {
            if (toolCallDelta.index !== undefined) {
              if (!toolCalls[toolCallDelta.index]) {
                toolCalls[toolCallDelta.index] = {
                  id: "",
                  type: "function",
                  function: { name: "", arguments: "" }
                };
              }
              
              const toolCall = toolCalls[toolCallDelta.index];
              if (toolCallDelta.id) toolCall.id = toolCallDelta.id;
              if (toolCallDelta.function?.name) toolCall.function.name = toolCallDelta.function.name;
              if (toolCallDelta.function?.arguments) {
                toolCall.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }
        
        // Handle regular content
        const content = delta?.content || '';
        fullResponse += content;
        if (content) {
          yield { type: 'token', content };
        }
      }

      // If tool calls were made, execute them
      if (toolCalls.length > 0) {
        this.messages.push({
          role: 'assistant',
          content: fullResponse || null,
          tool_calls: toolCalls,
        });

        // Execute tools with streaming
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Emit tool call event
            yield {
              type: 'tool_call',
              name: toolCall.function.name,
              args: args
            };

            // Stream tool execution progress
            let fullResult = '';
            for await (const chunk of executeStreamingToolCall(toolCall.function.name, args)) {
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.includes('...')) {
                  // Progress message
                  yield {
                    type: 'tool_progress',
                    name: toolCall.function.name,
                    message: line.replace(`[${toolCall.function.name}] `, '')
                  };
                } else if (line.includes('Done:') || line.includes('Result:')) {
                  // Final result
                  fullResult = line.substring(line.indexOf(':') + 1).trim();
                }
              }
            }

            // Emit tool result event
            yield {
              type: 'tool_result',
              name: toolCall.function.name,
              result: fullResult
            };

            this.messages.push({
              role: 'tool',
              content: fullResult,
              tool_call_id: toolCall.id,
            });
          } catch (error: any) {
            const errorMsg = `Error executing ${toolCall.function.name}: ${error.message}`;
            yield {
              type: 'tool_result',
              name: toolCall.function.name,
              result: errorMsg
            };
            
            this.messages.push({
              role: 'tool',
              content: errorMsg,
              tool_call_id: toolCall.id,
            });
          }
        }

        // Get the final response after tool execution
        const finalStream = await this.client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: this.messages,
          stream: true,
        });

        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            yield { type: 'token', content };
          }
        }
      }
    } catch (error) {
      console.error('Streaming Error:', error);
      yield { type: 'token', content: 'Error: Failed to get streaming response' };
    }
  }
}