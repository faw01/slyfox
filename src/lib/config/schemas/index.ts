/**
 * Central export for all schema definitions
 */

// Export problem schemas
export * from './problem';

// Export solution schemas
export * from './solution';

// Export debug schemas
export * from './debug';

// Export Gemini-specific schemas
export * from './gemini';

// Import schemas directly
import { problemSchema } from './problem';
import { detailedSolutionSchema } from './solution';
import { detailedDebugSchema } from './debug';
import { getGeminiSchemaForTask } from './gemini';

/**
 * Function to get the appropriate schema based on the task
 */
export function getSchemaForTask(task: 'extract' | 'solve' | 'debug'): any {
  switch (task) {
    case 'extract':
      return problemSchema;
    case 'solve':
      return detailedSolutionSchema;
    case 'debug':
      return detailedDebugSchema;
  }
} 