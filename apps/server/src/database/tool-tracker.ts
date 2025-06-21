import { toolStatements, transaction } from './index';

export class ToolTracker {
  static track(
    sessionId: string, 
    toolName: string, 
    args: any, 
    result: any, 
    executionTimeMs: number
  ) {
    transaction(() => {
      toolStatements.create.run(
        sessionId,
        toolName,
        JSON.stringify(args),
        JSON.stringify(result),
        executionTimeMs
      );
    });
  }

  static getSessionTools(sessionId: string) {
    return toolStatements.getBySession.all(sessionId);
  }

  static getToolStats() {
    return toolStatements.getStats.all();
  }
}