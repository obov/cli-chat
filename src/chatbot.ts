import OpenAI from "openai";
import { config } from "./config";
import { availableTools, executeToolCall, Tool, ToolCall } from "./tools";

export interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export class ChatBot {
  private openai: OpenAI | null = null;
  private messages: Message[] = [];
  private mode: "echo" | "openai";
  private useStore: boolean = false;
  private enableTools: boolean = false;
  private tools: Tool[] = [];

  constructor(mode: "echo" | "openai" = "echo", useStore: boolean = false, enableTools: boolean = false) {
    this.mode = mode;
    this.useStore = useStore;
    this.enableTools = enableTools;
    this.tools = enableTools ? availableTools : [];

    if (mode === "openai" && config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });

      // Add system message
      const systemMessage = enableTools
        ? "You are a helpful assistant with access to tools. You MUST use the get_weather tool when asked about weather, get_current_time tool when asked about time, and calculate tool for math. Never say you cannot provide real-time information - use the available tools instead."
        : "You are a helpful assistant in a CLI chatbot application.";
        
      this.messages.push({
        role: "system",
        content: systemMessage,
      });
    }
  }

  async getResponse(userInput: string): Promise<string> {
    if (this.mode === "echo") {
      return userInput;
    }

    if (!this.openai) {
      return "Error: OpenAI client not initialized";
    }

    try {
      // Add user message to history
      this.messages.push({ role: "user", content: userInput });

      // Get response from OpenAI (with optional store parameter for Responses API)
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages as any,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
        tools: this.tools.length > 0 ? this.tools : undefined,
        tool_choice: this.tools.length > 0 ? "auto" : undefined,
        ...(this.useStore && { store: true }),
      });

      const message = completion.choices[0]?.message;
      
      if (!message) {
        return "No response";
      }

      // Debug logging
      if (this.enableTools) {
        console.log('\n[DEBUG] Tool enabled, finish_reason:', completion.choices[0]?.finish_reason);
        console.log('[DEBUG] Tool calls:', message.tool_calls?.length || 0);
      }

      // Handle tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Add assistant message with tool calls
        this.messages.push({
          role: "assistant",
          content: message.content || "",
          tool_calls: message.tool_calls as ToolCall[],
        });

        // Execute tool calls
        for (const toolCall of message.tool_calls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await executeToolCall(toolCall.function.name, args);
            
            // Add tool result to messages (content should be string, not JSON)
            this.messages.push({
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            });
          } catch (error) {
            // Handle parsing or execution errors
            this.messages.push({
              role: "tool",
              content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
              tool_call_id: toolCall.id,
            });
          }
        }

        // Get final response after tool execution
        const finalCompletion = await this.openai.chat.completions.create({
          model: config.openai.model,
          messages: this.messages as any,
          temperature: config.openai.temperature,
          max_tokens: config.openai.maxTokens,
          ...(this.useStore && { store: true }),
        });

        const finalMessage = finalCompletion.choices[0]?.message?.content || "No response";
        this.messages.push({ role: "assistant", content: finalMessage });
        
        return finalMessage;
      } else {
        // Regular response without tools
        const responseContent = message.content || "No response";
        this.messages.push({ role: "assistant", content: responseContent });
        return responseContent;
      }
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return "Error: Failed to get response from OpenAI";
    }
  }

  clearHistory() {
    // Keep system message if it exists
    this.messages = this.messages.filter((msg) => msg.role === "system");
  }

  async *getStreamingResponse(userInput: string): AsyncGenerator<string, void, unknown> {
    if (this.mode === "echo") {
      yield userInput;
      return;
    }

    if (!this.openai) {
      yield "Error: OpenAI client not initialized";
      return;
    }

    try {
      this.messages.push({ role: "user", content: userInput });

      const stream = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages as any,
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
        tools: this.tools.length > 0 ? this.tools : undefined,
        tool_choice: this.tools.length > 0 ? "auto" : undefined,
        stream: true,
        ...(this.useStore && { store: true }),
      });

      let fullResponse = "";
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
        const content = delta?.content || "";
        fullResponse += content;
        if (content) yield content;
      }

      // If tool calls were made, execute them
      if (toolCalls.length > 0) {
        this.messages.push({
          role: "assistant",
          content: fullResponse || "",
          tool_calls: toolCalls,
        });

        // Execute tools
        for (const toolCall of toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const result = await executeToolCall(toolCall.function.name, args);
            
            this.messages.push({
              role: "tool",
              content: result,
              tool_call_id: toolCall.id,
            });
            
            yield `\n[${toolCall.function.name}]: ${result}\n`;
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
          ...(this.useStore && { store: true }),
        });

        let finalResponse = "";
        for await (const chunk of finalStream) {
          const content = chunk.choices[0]?.delta?.content || "";
          finalResponse += content;
          yield content;
        }
        
        this.messages.push({ role: "assistant", content: finalResponse });
      } else {
        // No tool calls, just save the response
        this.messages.push({ role: "assistant", content: fullResponse });
      }
    } catch (error) {
      console.error("Streaming Error:", error);
      yield "Error: Failed to get streaming response";
    }
  }

  getMode() {
    return this.mode;
  }

  getAvailableTools(): string[] {
    return this.tools.map(tool => tool.function.name);
  }
}
