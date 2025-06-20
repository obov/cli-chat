#!/usr/bin/env bun

import { executeToolCall } from '../src/tools';

console.log('🧪 Testing Agent Tools...\n');

// Test tool executions
const toolTests = [
  {
    name: 'get_current_time',
    args: { timezone: 'UTC' },
    shouldContain: 'UTC',
  },
  {
    name: 'get_current_time',
    args: { timezone: 'Invalid/Timezone' },
    shouldContain: 'Error',
  },
  {
    name: 'calculate',
    args: { expression: '2 + 2 * 3' },
    shouldContain: '= 8',
  },
  {
    name: 'calculate',
    args: { expression: '(10 - 5) * 2' },
    shouldContain: '= 10',
  },
  {
    name: 'get_weather',
    args: { location: 'London, UK' },
    shouldContain: '15°C',
  },
  {
    name: 'get_weather',
    args: { location: 'Unknown City' },
    shouldContain: 'not available',
  },
];

let passed = 0;
let failed = 0;

for (const test of toolTests) {
  const result = await executeToolCall(test.name, test.args);
  const success = result.includes(test.shouldContain);
  
  if (success) {
    console.log(`✅ ${test.name}(${JSON.stringify(test.args)})`);
    console.log(`   Result: ${result}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}(${JSON.stringify(test.args)})`);
    console.log(`   Expected to contain: "${test.shouldContain}"`);
    console.log(`   Got: ${result}`);
    failed++;
  }
  console.log('');
}

console.log(`📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tool tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tool tests failed!');
  process.exit(1);
}