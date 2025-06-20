#!/usr/bin/env bun

import { Command } from 'commander';
import { createInterface } from 'readline';
import { ChatBot } from './chatbot';
import { validateConfig } from './config';

const program = new Command();

program
  .name('cli-chatbot')
  .description('A CLI chatbot powered by OpenAI')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat session')
  .option('-m, --mode <mode>', 'Chat mode: echo or openai', 'echo')
  .action(async (options) => {
    const mode = options.mode as 'echo' | 'openai';
    
    // Validate config if using OpenAI mode
    if (mode === 'openai' && !validateConfig()) {
      process.exit(1);
    }
    
    const chatbot = new ChatBot(mode);
    const modeEmoji = mode === 'echo' ? '🔄' : '🤖';
    
    console.log(`${modeEmoji} ${mode.toUpperCase()} Mode Started! Type "exit" to quit.\n`);
    
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const askQuestion = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question('You: ', (answer) => {
          resolve(answer);
        });
      });
    };

    while (true) {
      try {
        const userInput = await askQuestion();
        
        if (userInput.toLowerCase().trim() === 'exit') {
          console.log('👋 Goodbye!');
          break;
        }
        
        if (userInput.toLowerCase().trim() === 'clear') {
          chatbot.clearHistory();
          console.log('🗑️  Chat history cleared!\n');
          continue;
        }
        
        // Get response from chatbot
        const response = await chatbot.getResponse(userInput);
        console.log(`Bot: ${response}\n`);
        
      } catch (error) {
        console.error('Error:', error);
        break;
      }
    }
    
    rl.close();
  });

program.parse();