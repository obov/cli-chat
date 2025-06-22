import { Router } from "express";
import { toolDefinitions } from "@cli-chatbot/shared";

export const toolsRouter = Router();

toolsRouter.get("/", (req, res) => {
  res.json({
    tools: toolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
    count: toolDefinitions.length,
  });
});
