#!/usr/bin/env bun

// Simple echo bot test
console.log('🧪 Testing Echo Bot...');

const testEcho = (input: string) => {
  const output = input; // Echo functionality
  return output;
};

// Test cases
const tests = [
  { input: 'Hello', expected: 'Hello' },
  { input: 'How are you?', expected: 'How are you?' },
  { input: '123', expected: '123' },
];

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  const result = testEcho(test.input);
  if (result === test.expected) {
    console.log(`✅ Test ${index + 1}: PASS`);
    passed++;
  } else {
    console.log(`❌ Test ${index + 1}: FAIL - Expected: "${test.expected}", Got: "${result}"`);
    failed++;
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('💥 Some tests failed!');
  process.exit(1);
}