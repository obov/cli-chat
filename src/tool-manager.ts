// Basic tool abstraction for universal tool management
export interface BaseTool {
  name: string;
  description: string;
  parameters: any;
}

export interface ToolResult {
  success: boolean;
  data?: string;
  error?: string;
}

export interface StreamingToolResult {
  success: boolean;
  error?: string;
}

export type ToolExecutor = (args: any) => Promise<string>;
export type StreamingToolExecutor = (args: any) => AsyncGenerator<string, string, unknown>;

export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private executors: Map<string, ToolExecutor | StreamingToolExecutor> = new Map();
  private isStreamingExecutor: Map<string, boolean> = new Map();

  /**
   * Register a tool with its executor function
   */
  registerTool(tool: BaseTool, executor: ToolExecutor | StreamingToolExecutor): void {
    this.tools.set(tool.name, tool);
    this.executors.set(tool.name, executor);
    
    // Check if executor is streaming by checking if it's a generator function
    const isStreaming = executor.constructor.name === 'AsyncGeneratorFunction';
    this.isStreamingExecutor.set(tool.name, isStreaming);
  }

  /**
   * Execute a tool by name with given arguments
   */
  async executeTool(name: string, args: any): Promise<ToolResult> {
    const executor = this.executors.get(name);
    
    if (!executor) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      const isStreaming = this.isStreamingExecutor.get(name) || false;
      
      if (isStreaming) {
        // For streaming executors, collect all chunks
        const streamingExecutor = executor as StreamingToolExecutor;
        let fullResult = '';
        
        for await (const chunk of streamingExecutor(args)) {
          fullResult += chunk;
        }
        
        return {
          success: true,
          data: fullResult,
        };
      } else {
        // Regular executor
        const result = await (executor as ToolExecutor)(args);
        return {
          success: true,
          data: result,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute a streaming tool and yield progress updates
   */
  async *executeStreamingTool(name: string, args: any): AsyncGenerator<string, StreamingToolResult, unknown> {
    const executor = this.executors.get(name);
    
    if (!executor) {
      yield `Error: Unknown tool: ${name}`;
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      const isStreaming = this.isStreamingExecutor.get(name) || false;
      
      if (isStreaming) {
        // Streaming executor - yield each chunk
        const streamingExecutor = executor as StreamingToolExecutor;
        let lastChunk = '';
        
        for await (const chunk of streamingExecutor(args)) {
          yield chunk;
          lastChunk = chunk;
        }
        
        return { success: true };
      } else {
        // Regular executor - execute and yield result
        const result = await (executor as ToolExecutor)(args);
        yield result;
        return { success: true };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      yield `Error: ${errorMsg}`;
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Get all registered tools
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool by name
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Check if a tool is streaming
   */
  isStreaming(name: string): boolean {
    return this.isStreamingExecutor.get(name) || false;
  }

  /**
   * Get tools formatted for OpenAI function calling
   */
  getToolsForProvider(provider: 'openai'): any[] {
    if (provider === 'openai') {
      return this.getAllTools().map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }
    
    // Future: Add support for other providers
    return [];
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
    this.executors.clear();
  }
}

// Singleton instance for convenience
export const defaultToolManager = new ToolManager();