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
  .option('-m, --mode <mode>', 'Chat mode: echo or agent', 'agent')
  .option('-t, --tools', 'Enable tools (deprecated - agent mode has tools by default)', false)
  .option('-s, --stream', 'Enable streaming responses', false)
  .option('--store', 'Enable server-side storage (Responses API)', false)
  .option('-a, --all', 'Enable all features (tools, stream, store)', false)
  .action(async (options) => {
    const mode = options.mode as 'echo' | 'agent';
    
    // Handle --all flag
    if (options.all) {
      options.stream = true;
      options.store = true;
    }
    
    // Validate config if using Agent mode
    if (mode === 'agent' && !validateConfig()) {
      process.exit(1);
    }
    
    let bot: ChatBot | Agent;
    let modeEmoji: string;
    
    if (mode === 'agent') {
      // Agent mode always has tools enabled by default
      bot = new Agent(true, options.stream);
      modeEmoji = '🤖';
      console.log(`${modeEmoji} AGENT Mode Started!`);
      console.log(`🔧 Available tools: ${bot.getAvailableTools().join(', ')}`);
      if (options.stream) {
        console.log('📡 Streaming mode enabled');
      }
      if (options.store) {
        console.log('💾 Server-side storage enabled');
      }
      console.log('Type "exit" to quit, "clear" to reset conversation.\n');
    } else {
      // Echo mode only
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
        if (options.stream && (bot instanceof Agent || bot instanceof ChatBot)) {
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