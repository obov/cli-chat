import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3002/ws';

interface WSMessage {
  type: string;
  content?: string;
  sessionId?: string;
  history?: any[];
  tool?: string;
  args?: any;
  result?: any;
  error?: string;
  timestamp?: string;
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(WS_URL);

      this.ws.on('open', () => {
        console.log('✅ Connected to WebSocket server');
        resolve();
      });

      this.ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;
        this.handleMessage(message);
      });

      this.ws.on('close', () => {
        console.log('❌ Disconnected from server');
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  private handleMessage(message: WSMessage) {
    // Store session ID
    if (message.sessionId && !this.sessionId) {
      this.sessionId = message.sessionId;
    }

    switch (message.type) {
      case 'message':
        console.log(`📨 Message: ${message.content}`);
        break;
      
      case 'token':
        process.stdout.write(message.content || '');
        break;
      
      case 'tool_call':
        console.log(`\n🔧 Tool Call: ${message.tool}`, message.args);
        break;
      
      case 'tool_progress':
        console.log(`⏳ ${message.tool}: ${message.content}`);
        break;
      
      case 'tool_result':
        console.log(`✅ ${message.tool}: ${message.result}`);
        break;
      
      case 'history':
        console.log(`\n📜 History (${message.history?.length} messages):`);
        message.history?.forEach((msg, idx) => {
          console.log(`  ${idx + 1}. [${msg.role}]: ${msg.content?.substring(0, 50)}...`);
        });
        break;
      
      case 'error':
        console.error(`❌ Error: ${message.error}`);
        break;
      
      case 'clear':
        console.log(`🧹 ${message.content}`);
        break;
      
      case 'pong':
        console.log(`🏓 Pong received at ${message.timestamp}`);
        break;
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  chat(message: string, enableTools: boolean = true) {
    this.send({
      type: 'chat',
      message,
      sessionId: this.sessionId,
      enableTools
    });
  }

  getHistory() {
    this.send({
      type: 'getHistory',
      sessionId: this.sessionId
    });
  }

  clearChat() {
    this.send({
      type: 'clear',
      sessionId: this.sessionId
    });
  }

  ping() {
    this.send({ type: 'ping' });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Test scenarios
async function runTests() {
  const client = new WebSocketClient();

  try {
    // Connect to server
    await client.connect();
    
    // Wait for welcome message
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n--- Test 1: Basic Chat ---');
    client.chat('Hello, WebSocket!', false);
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n--- Test 2: Chat with Tools ---');
    client.chat('What is 123 * 456?');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n--- Test 3: Get History ---');
    client.getHistory();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n--- Test 4: Weather with Tools ---');
    client.chat('Tell me the weather in Seoul and convert the temperature to Fahrenheit');
    await new Promise(resolve => setTimeout(resolve, 4000));

    console.log('\n--- Test 5: Clear Chat ---');
    client.clearChat();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n--- Test 6: Verify History Cleared ---');
    client.getHistory();
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n--- Test 7: Ping/Pong ---');
    client.ping();
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n--- Test 8: New Message After Clear ---');
    client.chat('This is a new conversation after clearing');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Close connection
    console.log('\n--- Closing Connection ---');
    client.close();

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests
console.log('🚀 Starting WebSocket Client Tests');
console.log(`📡 Connecting to ${WS_URL}`);
runTests();