/**
 * Prompts for problem extraction from screenshots
 */

/**
 * System/developer prompt for problem extraction
 */
export const extractSystemPrompt = `You are a coding assistant that extracts Leetcode problem information from screenshots into structured data. 
Extract key details and return them in JSON format with the following structure:
{
  "title": "The title of the problem",
  "problem_statement": "Clear problem statement combining title and description",
  "input_format": "Input format with parameters",
  "output_format": "Output format with type information",
  "constraints": {
    "time": "Time complexity requirements if specified",
    "space": "Space complexity requirements if specified",
    "other": ["Array of other constraints like array length limits", "Value ranges", "etc."]
  },
  "examples": "Example test cases",
  "validation": "Validation approach",
  "difficulty": "Difficulty level"
}`;

/**
 * User prompt for problem extraction
 * @param imageDataList Base64 encoded image data
 */
export const extractUserPrompt = (imageDataList: string[]) => {
  return {
    type: "text", 
    text: "Extract the coding problem details and return them as a JSON object."
  };
};

/**
 * Generates the complete message array for problem extraction
 * @param imageDataList Array of base64 encoded screenshots
 * @returns Array of messages to send to the AI model
 */
export function createProblemExtractionMessages(imageDataList: string[]) {
  return [
    {
      role: "developer",
      content: extractSystemPrompt
    },
    {
      role: "user",
      content: [
        extractUserPrompt(imageDataList),
        ...imageDataList.map(data => ({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64,${data}`
          }
        }))
      ]
    }
  ];
} 