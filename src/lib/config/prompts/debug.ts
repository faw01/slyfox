/**
 * Prompts for code debugging
 */

/**
 * System/developer prompt for code debugging
 */
export const debugSystemPrompt = `You are a coding assistant that debugs code and provides improved solutions with explanations.
Analyze the code and return a JSON response with:
{
  "what_changed": "Explain what modifications were made to handle the follow-up requirements while preserving the core solution structure",
  "issues": "List of identified issues or new requirements",
  "improvements": "Suggested improvements that build upon the existing solution",
  "modified_code": "Enhanced implementation that extends the original solution. IMPORTANT: Every line (both existing and new) must have a detailed comment explaining its purpose, why it's needed, and how it contributes to the solution. For modified lines, explain why the change was needed. Comments should be descriptive and explain the reasoning behind each operation.",
  "complexity": {
    "time": "Updated time complexity after modifications",
    "space": "Updated space complexity after modifications"
  },
  "follow_ups": "Potential follow-up questions and how they could be solved by further extending this solution"
}

Example comment style:
# [MODIFIED] Changed array to heap to efficiently find k largest elements
# Using heap because follow-up requires finding kth largest in O(log n) time instead of O(n)
max_heap = []

# [NEW] Track heap size to maintain only k elements
# This ensures space complexity remains O(k) instead of O(n)
current_size = 0

Make sure every line has this level of detailed explanation, clearly marking modified and new lines.
Important: Focus on modifying the existing solution rather than creating a new one from scratch.`;

/**
 * User prompt for code debugging
 * @param problemInfo Problem information
 * @returns User prompt text
 */
export const debugUserPrompt = (problemInfo: any) => {
  return `Debug and enhance this code to handle follow-up requirements while maintaining the core solution structure. Problem: ${JSON.stringify(problemInfo)}.`;
};

/**
 * Generates the complete message array for code debugging with screenshots
 * @param problemInfo Problem information
 * @param imageDataList Array of base64 encoded screenshots
 * @returns Array of messages to send to the AI model
 */
export function createDebugMessages(problemInfo: any, imageDataList: string[]) {
  return [
    {
      role: "developer",
      content: debugSystemPrompt
    },
    {
      role: "user",
      content: [
        { 
          type: "text", 
          text: debugUserPrompt(problemInfo) 
        },
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