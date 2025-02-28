/**
 * Gemini-specific schema definitions
 * 
 * These schemas use the SchemaType format required by the Google Generative AI library,
 * which differs from the JSON schema format used by OpenAI.
 */

import { SchemaType } from "@google/generative-ai";

/**
 * Problem extraction schema for Gemini models
 */
export const geminiProblemExtractionSchema = {
  description: "Problem information extracted from screenshots",
  type: SchemaType.OBJECT,
  properties: {
    problem_statement: {
      type: SchemaType.STRING,
      description: "Clear problem statement combining title and description",
      nullable: false
    },
    input_format: {
      type: SchemaType.STRING,
      description: "Input format with parameters",
      nullable: false
    },
    output_format: {
      type: SchemaType.STRING,
      description: "Output format with type information",
      nullable: false
    },
    complexity: {
      type: SchemaType.OBJECT,
      properties: {
        time: {
          type: SchemaType.STRING,
          description: "Time complexity requirements",
          nullable: false
        },
        space: {
          type: SchemaType.STRING,
          description: "Space complexity requirements",
          nullable: false
        }
      },
      required: ["time", "space"]
    },
    examples: {
      type: SchemaType.STRING,
      description: "Example test cases",
      nullable: false
    },
    validation: {
      type: SchemaType.STRING,
      description: "Validation approach",
      nullable: false
    },
    difficulty: {
      type: SchemaType.STRING,
      description: "Difficulty level",
      nullable: false
    }
  },
  required: ["problem_statement", "input_format", "output_format", "complexity", "examples", "validation", "difficulty"]
};

/**
 * Solution generation schema for Gemini models
 */
export const geminiSolutionSchema = {
  description: "Solution for the coding problem",
  type: SchemaType.OBJECT,
  properties: {
    approach: {
      type: SchemaType.STRING,
      description: "Detailed explanation of the solution approach",
      nullable: false
    },
    code: {
      type: SchemaType.STRING,
      description: "Implementation in the specified language",
      nullable: false
    },
    complexity: {
      type: SchemaType.OBJECT,
      properties: {
        time: {
          type: SchemaType.STRING,
          description: "Time complexity analysis",
          nullable: false
        },
        space: {
          type: SchemaType.STRING,
          description: "Space complexity analysis",
          nullable: false
        }
      },
      required: ["time", "space"]
    },
    explanation: {
      type: SchemaType.STRING,
      description: "Step by step explanation of the code",
      nullable: false
    }
  },
  required: ["approach", "code", "complexity", "explanation"]
};

/**
 * Debug analysis schema for Gemini models
 */
export const geminiDebugSchema = {
  description: "Debug analysis of the code",
  type: SchemaType.OBJECT,
  properties: {
    issues: {
      type: SchemaType.STRING,
      description: "List of identified issues",
      nullable: false
    },
    improvements: {
      type: SchemaType.STRING,
      description: "Suggested improvements",
      nullable: false
    },
    corrected_code: {
      type: SchemaType.STRING,
      description: "Fixed implementation",
      nullable: false
    },
    complexity: {
      type: SchemaType.OBJECT,
      properties: {
        time: {
          type: SchemaType.STRING,
          description: "Time complexity of improved solution",
          nullable: false
        },
        space: {
          type: SchemaType.STRING,
          description: "Space complexity of improved solution",
          nullable: false
        }
      },
      required: ["time", "space"]
    }
  },
  required: ["issues", "improvements", "corrected_code", "complexity"]
};

/**
 * Function to get the appropriate Gemini schema based on the task
 */
export function getGeminiSchemaForTask(task: 'extract' | 'solve' | 'debug'): any {
  switch (task) {
    case 'extract':
      return geminiProblemExtractionSchema;
    case 'solve':
      return geminiSolutionSchema;
    case 'debug':
      return geminiDebugSchema;
  }
} 