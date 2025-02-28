/**
 * Schema definitions for code debugging
 */

/**
 * Basic schema for code debugging
 */
export const debugSchema = {
  name: "debug_code",
  description: "Analyze and debug the provided code",
  parameters: {
    type: "object",
    properties: {
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["logic_error", "syntax_error", "performance_issue", "edge_case"]
            },
            location: { type: "string" },
            description: { type: "string" },
            fix: { type: "string" }
          }
        }
      },
      new_code: {
        type: "string",
        description: "The corrected code"
      },
      improvements: {
        type: "array",
        items: { type: "string" },
        description: "List of improvements made"
      },
      time_complexity: {
        type: "string",
        description: "Time complexity of the improved solution"
      },
      space_complexity: {
        type: "string",
        description: "Space complexity of the improved solution"
      }
    },
    required: ["issues", "new_code", "time_complexity", "space_complexity"]
  }
};

/**
 * Detailed schema for debugging with strict validation
 */
export const detailedDebugSchema = {
  type: "object",
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["logic_error", "syntax_error", "performance_issue", "edge_case"]
          },
          location: { type: "string" },
          description: { type: "string" },
          fix: { type: "string" }
        },
        required: ["type", "location", "description", "fix"],
        additionalProperties: false
      }
    },
    new_code: {
      type: "string",
      description: "The corrected code"
    },
    improvements: {
      type: "array",
      items: { type: "string" },
      description: "List of improvements made"
    },
    time_complexity: {
      type: "string",
      description: "Time complexity of the improved solution"
    },
    space_complexity: {
      type: "string",
      description: "Space complexity of the improved solution"
    }
  },
  required: [
    "issues",
    "new_code",
    "improvements",
    "time_complexity",
    "space_complexity"
  ],
  additionalProperties: false
}; 