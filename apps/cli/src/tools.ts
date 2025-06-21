import { defaultToolManager, ToolManager, BaseTool } from './tool-manager';

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    strict?: boolean;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
      additionalProperties?: boolean;
    };
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Register all available tools
function registerTools() {
  // get_current_time tool (streaming version)
  defaultToolManager.registerTool(
    {
      name: 'get_current_time',
      description: 'Get the current date and time in a specific timezone',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'The timezone to get the time for (e.g., "UTC", "America/New_York"). Optional - defaults to UTC.',
            default: 'UTC',
          },
        },
        required: [],
        additionalProperties: false,
      },
    },
    async function* (args: any) {
      yield '[get_current_time] Getting timezone info...';
      
      const timezone = args.timezone || 'UTC';
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        yield '[get_current_time] Formatting date...';
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const date = new Date();
        const options: Intl.DateTimeFormatOptions = {
          timeZone: timezone,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        };
        
        const result = date.toLocaleString('en-US', options);
        yield `[get_current_time] Done: ${result}`;
        return result;
      } catch (error) {
        const errorMsg = `Error: Invalid timezone "${timezone}"`;
        yield `[get_current_time] ${errorMsg}`;
        return errorMsg;
      }
    }
  );

  // calculate tool (streaming version)
  defaultToolManager.registerTool(
    {
      name: 'calculate',
      description: 'Perform basic mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate (e.g., "2 + 2", "10 * 5")',
          },
        },
        required: ['expression'],
        additionalProperties: false,
      },
    },
    async function* (args: any) {
      yield '[calculate] Parsing expression...';
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 150));
      
      try {
        // Simple safe math evaluation
        const expression = args.expression.replace(/[^0-9+\-*/().\s]/g, '');
        
        yield '[calculate] Computing result...';
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const result = new Function('return ' + expression)();
        const output = `${expression} = ${result}`;
        
        yield `[calculate] Done: ${output}`;
        return output;
      } catch (error) {
        const errorMsg = `Error: Invalid expression "${args.expression}"`;
        yield `[calculate] ${errorMsg}`;
        return errorMsg;
      }
    }
  );

  // get_weather tool (streaming version)
  defaultToolManager.registerTool(
    {
      name: 'get_weather',
      description: 'Get the current weather for any location. Use this when users ask about weather anywhere.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name (e.g., "Seoul", "New York") or "here" for current location',
          },
        },
        required: ['location'],
        additionalProperties: false,
      },
    },

    async function* (args: any) {
      console.log('[TOOL DEBUG] get_weather called with args:', args);
      yield '[get_weather] Checking location...';
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Mock weather data - expanded for more locations
      const weatherData: Record<string, any> = {
        'London, UK': { temp: '15°C', condition: 'Cloudy', humidity: '75%' },
        'New York, USA': { temp: '22°C', condition: 'Sunny', humidity: '60%' },
        'Tokyo, Japan': { temp: '18°C', condition: 'Rainy', humidity: '85%' },
        'Seoul': { temp: '20°C', condition: 'Clear', humidity: '55%' },
        'Seoul, Korea': { temp: '20°C', condition: 'Clear', humidity: '55%' },
        '서울': { temp: '20°C', condition: '맑음', humidity: '55%' },
        'here': { temp: '21°C', condition: 'Partly Cloudy', humidity: '65%' },
        '여기': { temp: '21°C', condition: '구름 조금', humidity: '65%' },
        '오늘': { temp: '21°C', condition: '맑음', humidity: '65%' },
      };
      
      const location = args.location?.toLowerCase() || 'here';
      
      yield '[get_weather] Fetching weather data...';
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check for exact match first
      let data = weatherData[location];
      
      // If no exact match, check for partial matches
      if (!data) {
        for (const key in weatherData) {
          if (key.toLowerCase().includes(location) || location.includes(key.toLowerCase())) {
            data = weatherData[key];
            break;
          }
        }
      }
      
      yield '[get_weather] Processing weather information...';
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Default response for unknown locations
      let result: string;
      if (!data) {
        data = { temp: '19°C', condition: 'Clear', humidity: '70%' };
        result = `Weather for ${args.location}: ${data.temp}, ${data.condition}, Humidity: ${data.humidity} (simulated data)`;
      } else {
        result = `Weather in ${args.location}: ${data.temp}, ${data.condition}, Humidity: ${data.humidity}`;
      }
      
      yield `[get_weather] Done: ${result}`;
      return result;
    }
  );
}

// Initialize tools
registerTools();

// Export for backward compatibility
export const availableTools: Tool[] = defaultToolManager.getToolsForProvider('openai');

// Tool execution wrapper for backward compatibility
export async function executeToolCall(name: string, args: any): Promise<string> {
  const result = await defaultToolManager.executeTool(name, args);
  if (result.success) {
    return result.data || '';
  } else {
    return result.error || `Unknown tool: ${name}`;
  }
}

// Streaming tool execution wrapper
export async function* executeStreamingToolCall(name: string, args: any): AsyncGenerator<string, void, unknown> {
  for await (const chunk of defaultToolManager.executeStreamingTool(name, args)) {
    yield chunk;
  }
}

// Export the tool manager for direct access if needed
export { defaultToolManager as toolManager };