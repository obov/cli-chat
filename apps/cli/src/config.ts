import dotenv from "dotenv";

dotenv.config();

export const config = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1000"),
  },
};

export function validateConfig() {
  if (!config.openai.apiKey) {
    console.error(
      "⚠️  OPENAI_API_KEY is not set. Please create a .env file with your API key."
    );
    console.error("   Copy .env.example to .env and add your key.");
    return false;
  }
  return true;
}
