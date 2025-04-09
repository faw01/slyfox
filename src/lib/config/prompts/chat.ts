/**
 * Prompts for chat functionality
 */

/**
 * System/developer prompt for chat interactions
 */
export const chatSystemPrompt = `You are a helpful AI assistant integrated into an Electron desktop application. 
You provide concise, accurate responses to user questions.
Your responses should be clear, direct, and actionable.
When discussing code or technical concepts, provide practical examples where helpful.
You can help with programming questions, explain concepts, suggest solutions, or assist with general inquiries.
Focus on being helpful while keeping responses concise and to the point.`;

/**
 * User prompt for chat interactions
 * @param userMessage The user's message
 */
export const chatUserPrompt = (userMessage: string) => {
  return userMessage;
};

/**
 * Generates the complete message array for chat interactions
 * @param userMessage The user's message
 * @param previousMessages Optional array of previous messages to include in the conversation
 * @returns Array of messages to send to the AI model
 */
export function createChatMessages(userMessage: string, previousMessages?: Array<{role: string; content: string}>) {
  // Start with the system prompt
  const messages = [
    {
      role: "developer",
      content: chatSystemPrompt
    }
  ];
  
  // Add previous messages if they exist
  if (previousMessages && previousMessages.length > 0) {
    messages.push(...previousMessages);
  }
  
  // Add the current user message
  messages.push({
    role: "user",
    content: chatUserPrompt(userMessage)
  });
  
  return messages;
} 