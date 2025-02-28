/**
 * Central configuration module for the application
 * 
 * This module serves as the single source of truth for all
 * configuration related to prompts and schemas used throughout the app.
 */

// Export prompts
export * from './prompts';

// Export schemas
export * from './schemas';

// Import specific modules
import * as extractPrompts from './prompts/extract';
import * as solvePrompts from './prompts/solve';
import * as debugPrompts from './prompts/debug';

import { problemSchema } from './schemas/problem';
import { detailedSolutionSchema } from './schemas/solution';
import { detailedDebugSchema } from './schemas/debug';

/**
 * Determine which schema to use based on the task type
 * @param task The task to perform
 * @returns The appropriate schema for the task
 */
export function getConfigForTask(task: 'extract' | 'solve' | 'debug') {
  return {
    prompts: task === 'extract' 
      ? extractPrompts
      : task === 'solve'
        ? solvePrompts
        : debugPrompts,
    
    schema: task === 'extract'
      ? problemSchema
      : task === 'solve'
        ? detailedSolutionSchema
        : detailedDebugSchema
  };
} 