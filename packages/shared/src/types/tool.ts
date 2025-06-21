export interface BaseTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type ToolExecutor = (args: any) => Promise<ToolExecutionResult | string>;