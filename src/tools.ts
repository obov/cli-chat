export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
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

// Example tools that the agent can use
export const availableTools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'The timezone to get the time for (e.g., "UTC", "America/New_York")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform basic mathematical calculations',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate',
          },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the current weather for any location. Use this when users ask about weather anywhere.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name or "here" for current location',
          },
        },
        required: ['location'],
      },
    },
  },
];

// Tool implementations
export async function executeToolCall(name: string, args: any): Promise<string> {
  switch (name) {
    case 'get_current_time': {
      const timezone = args.timezone || 'UTC';
      try {
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
        return date.toLocaleString('en-US', options);
      } catch (error) {
        return `Error: Invalid timezone "${timezone}"`;
      }
    }

    case 'calculate': {
      try {
        // Simple safe math evaluation
        const expression = args.expression.replace(/[^0-9+\-*/().\s]/g, '');
        const result = new Function('return ' + expression)();
        return `${expression} = ${result}`;
      } catch (error) {
        return `Error: Invalid expression "${args.expression}"`;
      }
    }

    case 'get_weather': {
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
      
      // Default response for unknown locations
      if (!data) {
        data = { temp: '19°C', condition: 'Clear', humidity: '70%' };
        return `Weather for ${args.location}: ${data.temp}, ${data.condition}, Humidity: ${data.humidity} (simulated data)`;
      }
      
      return `Weather in ${args.location}: ${data.temp}, ${data.condition}, Humidity: ${data.humidity}`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}