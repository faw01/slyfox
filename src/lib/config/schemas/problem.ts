/**
 * Schema definitions for problem extraction
 */

/**
 * Schema used for structured extraction of problem details from screenshots
 */
export const problemExtractionSchema = {
  name: "extract_problem",
  description: "Extract coding problem details from the provided information",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "The title of the coding problem"
      },
      problem_statement: {
        type: "string",
        description: "Clear and complete problem statement combining title and description"
      },
      input_format: {
        type: "object",
        description: "Input parameters and their types",
        properties: {
          parameters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                type: { type: "string" },
                description: { type: "string" }
              }
            }
          }
        }
      },
      output_format: {
        type: "object",
        description: "Expected output format and type",
        properties: {
          type: { type: "string" },
          description: { type: "string" }
        }
      },
      constraints: {
        type: "object",
        properties: {
          time: { type: "string" },
          space: { type: "string" },
          other: { 
            type: "array", 
            items: { type: "string" },
            description: "Additional constraints like array length, value ranges, etc."
          }
        }
      },
      test_cases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            input: { type: "string" },
            output: { type: "string" },
            explanation: { type: "string" }
          }
        }
      },
      validation_type: {
        type: "string",
        enum: ["unit_tests", "example_cases", "constraints", "edge_cases"]
      },
      difficulty: {
        type: "string",
        enum: ["easy", "medium", "hard"]
      }
    },
    required: ["title", "problem_statement", "input_format", "output_format", "test_cases"]
  }
};

/**
 * Detailed schema for problem extraction with strict validation
 */
export const problemSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "The title of the problem"
    },
    problem_statement: { 
      type: "string",
      description: "Clear problem statement combining title and description"
    },
    input_format: { 
      type: "object",
      description: "Input parameters and their types",
      properties: {
        parameters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              type: { type: "string" },
              description: { type: "string" }
            },
            required: ["name", "type", "description"],
            additionalProperties: false
          }
        }
      },
      required: ["parameters"],
      additionalProperties: false
    },
    output_format: { 
      type: "object",
      description: "Expected output format and type",
      properties: {
        type: { type: "string" },
        description: { type: "string" }
      },
      required: ["type", "description"],
      additionalProperties: false
    },
    constraints: {
      type: "object",
      properties: {
        time: { type: "string" },
        space: { type: "string" },
        other: { 
          type: "array", 
          items: { type: "string" },
          description: "Additional constraints like array length, value ranges, etc."
        }
      },
      required: ["time", "space"],
      additionalProperties: false
    },
    test_cases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          input: { type: "string" },
          output: { type: "string" },
          explanation: { type: "string" }
        },
        required: ["input", "output", "explanation"],
        additionalProperties: false
      }
    },
    validation_type: {
      type: "string",
      enum: ["unit_tests", "example_cases", "constraints", "edge_cases"]
    },
    difficulty: {
      type: "string",
      enum: ["easy", "medium", "hard"]
    },
    leetcode_match: {
      type: "object",
      properties: {
        problem_number: { type: "string" },
        title: { type: "string" },
        difficulty: { type: "string" },
        pattern: { type: "string" },
        match_explanation: { type: "string" }
      },
      required: ["problem_number", "title", "difficulty", "pattern"],
      additionalProperties: false
    }
  },
  required: [
    "title",
    "problem_statement",
    "input_format",
    "output_format",
    "constraints",
    "test_cases",
    "validation_type",
    "difficulty"
  ],
  additionalProperties: false
}; 