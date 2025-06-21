#!/usr/bin/env bun

import { ChatBot } from '../src/chatbot';

console.log('🧪 Testing ChatBot with Echo and OpenAI modes...\n');

// Test Echo Mode
console.log('📋 Testing Echo Mode:');
const echoBot = new ChatBot('echo');

const echoTests = [
  'Hello World',
  'How are you?',
  'Testing echo mode',
];

for (const test of echoTests) {
  const response = await echoBot.getResponse(test);
  const passed = response === test;
  console.log(`${passed ? '✅' : '❌'} Input: "${test}" => Output: "${response}"`);
}

// Test OpenAI Mode (mock without API key)
console.log('\n📋 Testing OpenAI Mode (without API key):');
const openaiBot = new ChatBot('openai');

const openaiResponse = await openaiBot.getResponse('Hello');
const expectedError = openaiResponse.includes('Error');
console.log(`${expectedError ? '✅' : '❌'} Properly handles missing API key: "${openaiResponse}"`);

console.log('\n🎉 Tests completed!');