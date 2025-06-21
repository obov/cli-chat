// SSE Client Test Script
// Run with: npx ts-node tests/sse-client.test.ts

const EventSource = require('eventsource');

const BASE_URL = 'http://localhost:3002';

// Test 1: Basic SSE connection with simple message
async function testBasicSSE() {
  console.log('\n🧪 Test 1: Basic SSE connection');
  console.log('=' . repeat(50));
  
  return new Promise((resolve) => {
    const url = `${BASE_URL}/api/chat/stream?message=${encodeURIComponent('Hello, how are you?')}`;
    const eventSource = new EventSource(url);
    
    let tokenBuffer = '';
    
    eventSource.addEventListener('token', (event: any) => {
      const data = JSON.parse(event.data);
      process.stdout.write(data.content);
      tokenBuffer += data.content;
    });
    
    eventSource.addEventListener('done', (event: any) => {
      console.log('\n\n✅ Stream completed');
      console.log('Full response:', tokenBuffer);
      eventSource.close();
      resolve(true);
    });
    
    eventSource.addEventListener('error', (event: any) => {
      console.error('\n❌ Error:', event);
      eventSource.close();
      resolve(false);
    });
  });
}

// Test 2: SSE with tool calling
async function testSSEWithTools() {
  console.log('\n🧪 Test 2: SSE with tool calling');
  console.log('=' . repeat(50));
  
  return new Promise((resolve) => {
    const url = `${BASE_URL}/api/chat/stream?message=${encodeURIComponent('What is the weather in Seoul?')}&enableTools=true`;
    const eventSource = new EventSource(url);
    
    let tokenBuffer = '';
    
    eventSource.addEventListener('tool_call', (event: any) => {
      const data = JSON.parse(event.data);
      console.log(`\n🔧 Tool called: ${data.tool}`);
      console.log('   Args:', JSON.stringify(data.args));
    });
    
    eventSource.addEventListener('tool_progress', (event: any) => {
      const data = JSON.parse(event.data);
      console.log(`   [${data.tool}] ${data.message}`);
    });
    
    eventSource.addEventListener('tool_result', (event: any) => {
      const data = JSON.parse(event.data);
      console.log(`   [${data.tool}] Result: ${data.result}\n`);
    });
    
    eventSource.addEventListener('token', (event: any) => {
      const data = JSON.parse(event.data);
      process.stdout.write(data.content);
      tokenBuffer += data.content;
    });
    
    eventSource.addEventListener('done', (event: any) => {
      console.log('\n\n✅ Stream completed');
      console.log('Full response:', tokenBuffer);
      eventSource.close();
      resolve(true);
    });
    
    eventSource.addEventListener('error', (event: any) => {
      console.error('\n❌ Error:', event);
      eventSource.close();
      resolve(false);
    });
  });
}

// Test 3: SSE with session persistence
async function testSSEWithSession() {
  console.log('\n🧪 Test 3: SSE with session persistence');
  console.log('=' . repeat(50));
  
  const sessionId = 'test-session-' + Date.now();
  
  // First message
  console.log('\n📤 First message with session:', sessionId);
  await new Promise((resolve) => {
    const url = `${BASE_URL}/api/chat/stream?message=${encodeURIComponent('My name is Alice')}&sessionId=${sessionId}`;
    const eventSource = new EventSource(url);
    
    eventSource.addEventListener('token', (event: any) => {
      const data = JSON.parse(event.data);
      process.stdout.write(data.content);
    });
    
    eventSource.addEventListener('done', (event: any) => {
      console.log('\n✅ First message completed');
      eventSource.close();
      resolve(true);
    });
  });
  
  // Second message
  console.log('\n📤 Second message with same session');
  await new Promise((resolve) => {
    const url = `${BASE_URL}/api/chat/stream?message=${encodeURIComponent('What is my name?')}&sessionId=${sessionId}`;
    const eventSource = new EventSource(url);
    
    eventSource.addEventListener('token', (event: any) => {
      const data = JSON.parse(event.data);
      process.stdout.write(data.content);
    });
    
    eventSource.addEventListener('done', (event: any) => {
      const data = JSON.parse(event.data);
      console.log('\n✅ Second message completed');
      console.log('Session history length:', data.historyLength);
      eventSource.close();
      resolve(true);
    });
  });
}

// Test 4: POST endpoint test
async function testPOSTEndpoint() {
  console.log('\n🧪 Test 4: POST endpoint for SSE');
  console.log('=' . repeat(50));
  
  console.log('Note: POST SSE endpoint requires a different client approach.');
  console.log('This endpoint is useful for sending complex data in request body.');
  console.log('Example usage with fetch + ReadableStream would be needed.');
  
  // This would require a more complex implementation with fetch API
  // as EventSource only supports GET requests
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting SSE Client Tests');
  console.log('   Server should be running on', BASE_URL);
  
  try {
    await testBasicSSE();
    await testSSEWithTools();
    await testSSEWithSession();
    await testPOSTEndpoint();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Check if EventSource is available
if (typeof EventSource === 'undefined') {
  console.log('📦 Installing eventsource package...');
  console.log('Run: yarn add -D eventsource');
  console.log('Then run this test again.');
} else {
  runTests();
}