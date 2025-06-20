#!/usr/bin/env bun

import { Command } from 'commander';
import { createInterface } from 'readline';
import { ChatBot } from './chatbot';
import { Agent } from './agent';
import { validateConfig } from './config';

const program = new Command();

program
  .name('cli-chatbot')
  .description('A CLI chatbot powered by OpenAI')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat session')
  .option('-m, --mode <mode>', 'Chat mode: echo, openai, or agent', 'echo')
  .option('-t, --tools', 'Enable tools in agent mode', false)
  .option('-s, --stream', 'Enable streaming responses in agent mode', false)
  .action(async (options) => {
    const mode = options.mode as 'echo' | 'openai' | 'agent';
    
    // Validate config if using OpenAI or Agent mode
    if ((mode === 'openai' || mode === 'agent') && !validateConfig()) {
      process.exit(1);
    }
    
    let bot: ChatBot | Agent;
    let modeEmoji: string;
    
    if (mode === 'agent') {
      bot = new Agent(options.tools, options.stream);
      modeEmoji = '🤖';
      console.log(`${modeEmoji} AGENT Mode Started!`);
      if (options.tools) {
        console.log(`🔧 Available tools: ${bot.getAvailableTools().join(', ')}`);
      }
      if (options.stream) {
        console.log('📡 Streaming mode enabled');
      }
      console.log('Type "exit" to quit, "clear" to reset conversation.\n');
    } else if (mode === 'openai') {
      bot = new ChatBot('openai');
      modeEmoji = '🤖';
      console.log(`${modeEmoji} OPENAI Mode Started! Type "exit" to quit.\n`);
    } else {
      bot = new ChatBot('echo');
      modeEmoji = '🔄';
      console.log(`${modeEmoji} ECHO Mode Started! Type "exit" to quit.\n`);
    }
    
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
          bot.clearHistory();
          console.log('🗑️  Chat history cleared!\n');
          continue;
        }
        
        // Get response
        if (mode === 'agent' && options.stream && bot instanceof Agent) {
          process.stdout.write('Bot: ');
          for await (const chunk of bot.getStreamingResponse(userInput)) {
            process.stdout.write(chunk);
          }
          process.stdout.write('\n\n');
        } else {
          const response = await bot.getResponse(userInput);
          console.log(`Bot: ${response}\n`);
        }
        
      } catch (error) {
        console.error('Error:', error);
        break;
      }
    }
    
    rl.close();
  });

program.parse();