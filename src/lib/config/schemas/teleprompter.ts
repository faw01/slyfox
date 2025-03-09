/**
 * Schema definitions for teleprompter interview responses
 */

/**
 * Schema used for structured generation of interview responses
 */
export const teleprompterResponseSchema = {
  name: "generate_interview_response",
  description: "Generate a professional interview response to the given question",
  parameters: {
    type: "object",
    properties: {
      response: {
        type: "string",
        description: "A concise, professional response to the interview question"
      },
      key_points: {
        type: "array",
        items: {
          type: "string"
        },
        description: "2-4 key points that the response addresses"
      },
      recommended_approach: {
        type: "string",
        description: "Brief advice on tone or emphasis for delivering this response",
        enum: ["confident", "thoughtful", "enthusiastic", "balanced", "technical", "conversational"]
      }
    },
    required: ["response"]
  }
};

/**
 * Simplified schema for basic teleprompter responses
 */
export const simpleTeleprompterResponseSchema = {
  type: "object",
  properties: {
    response: {
      type: "string",
      description: "A professional response to the interview question"
    }
  },
  required: ["response"]
}; 