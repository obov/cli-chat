import OpenAI from 'openai';
import { config } from './config';
import { availableTools, executeToolCall, executeStreamingToolCall, Tool, ToolCall } from './tools';

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  timestamp?: string;
  id?: string; // Our custom ID for tracking, not sent to OpenAI
}

export class Agent {
  private openai: OpenAI | null = null;
  private messages: AgentMessage[] = [];
  private tools: Tool[];
  private enableTools: boolean;
  private streamMode: boolean;
  private clientMetadata: { timezone?: string; locale?: string } = {};

  constructor(enableTools: boolean = true, streamMode: boolean = false) {
    this.enableTools = enableTools;
    this.tools = enableTools ? availableTools : [];
    this.streamMode = streamMode;
    
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
      
      // Add system message with tool awareness
      const systemMessage = enableTools
        ? 'You are a helpful AI assistant with access to various tools. You MUST use these tools when users ask for information that the tools can provide. For example: use get_weather when asked about weather, use get_current_time when asked about time, use calculate for math problems. Always use the appropriate tool rather than saying you cannot help. NEVER describe or mention tool calls in your text response - just use them directly.'
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
      this.messages.push({ role: 'user', content: userInput, timestamp: new Date().toISOString() });

      // Create chat completion with tools
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.getOpenAIMessages() as any,
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
          
          // Auto-inject client timezone and locale for get_current_time if not specified
          if (toolCall.function.name === 'get_current_time') {
            if (!args.timezone && this.clientMetadata.timezone) {
              args.timezone = this.clientMetadata.timezone;
            }
            if (!args.locale && this.clientMetadata.locale) {
              args.locale = this.clientMetadata.locale;
            }
          }
          
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
          messages: this.getOpenAIMessages() as any,
          temperature: config.openai.temperature,
          max_tokens: config.openai.maxTokens,
        });

        const finalMessage = finalCompletion.choices[0]?.message?.content || 'No response';
        this.messages.push({ role: 'assistant', content: finalMessage, timestamp: new Date().toISOString() });
        
        return finalMessage;
      } else {
        // Regular response without tools
        const responseContent = message.content || 'No response';
        this.messages.push({ role: 'assistant', content: responseContent, timestamp: new Date().toISOString() });
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
      this.messages.push({ role: 'user', content: userInput, timestamp: new Date().toISOString() });

      const stream = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.getOpenAIMessages() as any,
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
          timestamp: new Date().toISOString()
        });

        // Execute tools with streaming
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Auto-inject client timezone for get_current_time if not specified
            if (toolCall.function.name === 'get_current_time' && !args.timezone && this.clientMetadata.timezone) {
              args.timezone = this.clientMetadata.timezone;
            }
            
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
              timestamp: new Date().toISOString()
            });
            
            yield '\n';
          } catch (error) {
            yield `\n[Error]: ${error}\n`;
          }
        }

        // Get final response after tool execution
        const finalStream = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: this.getOpenAIMessages() as any,
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
    
    // Filter out UI-only system messages and standalone tool messages
    const validMessages = messages.filter((msg, index) => {
      // Filter out UI-only system messages (tool tracking messages)
      if (msg.role === 'system' && msg.content) {
        const content = msg.content;
        if (content.includes('🔧 Calling tool:') || 
            content.includes('⏳') || 
            content.includes('✅ Tool result:')) {
          return false;
        }
      }
      
      // Filter out standalone tool messages
      if (msg.role === 'tool') {
        // Check if previous message has tool_calls
        for (let i = index - 1; i >= 0; i--) {
          const prevMsg = messages[i];
          if (prevMsg.role === 'assistant' && prevMsg.tool_calls) {
            return true;
          }
        }
        return false;
      }
      
      return true;
    });
    
    this.messages = systemMessage ? [systemMessage, ...validMessages] : validMessages;
  }

  setClientMetadata(metadata: { timezone?: string; locale?: string }) {
    this.clientMetadata = metadata;
  }

  getAvailableTools(): string[] {
    return this.tools.map(tool => tool.function.name);
  }

  getMessages(): AgentMessage[] {
    return this.messages;
  }

  // Filter messages for OpenAI API calls
  private getOpenAIMessages(): any[] {
    // First pass: identify which messages to keep
    const keepFlags = new Array(this.messages.length).fill(true);
    
    // Mark UI-only system messages for removal
    this.messages.forEach((msg, index) => {
      if (msg.role === 'system' && msg.content) {
        const content = msg.content;
        if (content.includes('🔧 Calling tool:') || 
            content.includes('⏳') || 
            content.includes('✅ Tool result:')) {
          keepFlags[index] = false;
        }
      }
    });
    
    // Mark orphaned tool messages for removal
    this.messages.forEach((msg, index) => {
      if (msg.role === 'tool') {
        let foundToolCall = false;
        // Look backwards for assistant message with tool_calls
        for (let i = index - 1; i >= 0; i--) {
          // Skip messages we're already filtering out
          if (!keepFlags[i]) continue;
          
          const prevMsg = this.messages[i];
          if (prevMsg.role === 'assistant' && prevMsg.tool_calls) {
            foundToolCall = true;
            break;
          }
        }
        
        if (!foundToolCall) {
          keepFlags[index] = false;
        }
      }
    });
    
    // Second pass: filter and clean messages
    const filtered = this.messages.filter((_, index) => keepFlags[index]);
    
    // Remove our custom fields that OpenAI doesn't expect
    const openAIMessages = filtered.map(msg => {
      const cleanMsg: any = {
        role: msg.role,
        content: msg.content
      };
      
      // Only include OpenAI-expected fields
      if (msg.tool_calls) cleanMsg.tool_calls = msg.tool_calls;
      if (msg.tool_call_id) cleanMsg.tool_call_id = msg.tool_call_id;
      
      // Explicitly exclude our custom fields
      // Do not include: id, timestamp
      
      return cleanMsg;
    });
    
    // Final validation before sending to OpenAI
    const finalValidation: any[] = [];
    let lastAssistantWithToolCalls: any = null;
    
    openAIMessages.forEach((msg, idx) => {
      // Track assistant messages with tool_calls
      if (msg.role === 'assistant' && msg.tool_calls) {
        lastAssistantWithToolCalls = msg;
      }
      
      // Check tool messages
      if (msg.role === 'tool') {
        // Verify tool_call_id matches
        if (!lastAssistantWithToolCalls || 
            !lastAssistantWithToolCalls.tool_calls.some((tc: any) => tc.id === msg.tool_call_id)) {
          return; // Skip this message
        }
      }
      
      finalValidation.push(msg);
    });
    
    return finalValidation;
  }

  // New method for SSE/WebSocket streaming that returns structured chunks
  async *getStructuredStreamingResponse(message: string): AsyncGenerator<{
    type: 'token' | 'tool_call' | 'tool_progress' | 'tool_result';
    content?: string;
    name?: string;
    args?: any;
    message?: string;
    result?: any;
  }> {
    if (!this.openai) {
      yield { type: 'token', content: 'Error: OpenAI client not initialized' };
      return;
    }

    this.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    try {
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: this.getOpenAIMessages(),
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
          timestamp: new Date().toISOString()
        });

        // Execute tools with streaming
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Auto-inject client timezone for get_current_time if not specified
            if (toolCall.function.name === 'get_current_time' && !args.timezone && this.clientMetadata.timezone) {
              args.timezone = this.clientMetadata.timezone;
            }
            
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
              timestamp: new Date().toISOString()
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
        const finalStream = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: this.getOpenAIMessages(),
          stream: true,
        });

        let finalResponse = '';
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            finalResponse += content;
            yield { type: 'token', content };
          }
        }
        
        // Add final response to messages
        this.messages.push({ role: 'assistant', content: finalResponse, timestamp: new Date().toISOString() });
      } else {
        // No tool calls, add the response to messages
        this.messages.push({ role: 'assistant', content: fullResponse, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      console.error('Streaming Error:', error);
      yield { type: 'token', content: 'Error: Failed to get streaming response' };
    }
  }
}