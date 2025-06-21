import { Router } from 'express';
import { availableTools } from '../../tools';

export const toolsRouter = Router();

toolsRouter.get('/', (req, res) => {
  const tools = availableTools;
  
  res.json({
    tools: tools.map(tool => ({
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters
    })),
    count: tools.length
  });
});