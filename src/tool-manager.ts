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

export type ToolExecutor = (args: any) => Promise<string>;

export class ToolManager {
  private tools: Map<string, BaseTool> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();

  /**
   * Register a tool with its executor function
   */
  registerTool(tool: BaseTool, executor: ToolExecutor): void {
    this.tools.set(tool.name, tool);
    this.executors.set(tool.name, executor);
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
      const result = await executor(args);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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