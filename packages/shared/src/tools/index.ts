export const toolDefinitions = [
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
  {
    name: 'get_weather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and country (e.g., "San Francisco, USA")',
        },
      },
      required: ['location'],
    },
  },
  {
    name: 'calculate',
    description: 'Perform a mathematical calculation',
    parameters: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 3")',
        },
      },
      required: ['expression'],
    },
  },
  {
    name: 'search_files',
    description: 'Search for files in the current directory',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The search pattern (e.g., "*.ts" or "test")',
        },
        path: {
          type: 'string',
          description: 'The directory path to search in. Optional - defaults to current directory.',
          default: '.',
        },
      },
      required: ['pattern'],
    },
  },
];