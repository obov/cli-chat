#!/usr/bin/env bun

import { Command } from 'commander';
import { createInterface } from 'readline';

const program = new Command();

program
  .name('cli-chatbot')
  .description('A CLI chatbot powered by OpenAI')
  .version('1.0.0');

program
  .command('chat')
  .description('Start interactive chat session')
  .action(async () => {
    console.log('🤖 Echo Bot Started! Type "exit" to quit.\n');
    
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
        
        // Echo bot functionality
        console.log(`Bot: ${userInput}\n`);
        
      } catch (error) {
        console.error('Error:', error);
        break;
      }
    }
    
    rl.close();
  });

program.parse();