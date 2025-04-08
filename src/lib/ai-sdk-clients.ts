/**
 * Vercel AI SDK clients initialization
 * Provides standardized interfaces for multiple AI providers
 */

import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

interface APIKeys {
  openai?: string | null;
  anthropic?: string | null;
  google?: string | null;
  [key: string]: string | null | undefined;
}

/**
 * Create Vercel AI SDK clients using existing API keys
 * @param apiKeys Object containing provider API keys
 * @returns Object with initialized AI SDK clients
 */
export function createAISDKClients(apiKeys: APIKeys) {
  // Create provider instances with API keys
  const openaiInstance = apiKeys.openai 
    ? createOpenAI({ apiKey: apiKeys.openai as string }) 
    : null;
    
  const anthropicInstance = apiKeys.anthropic 
    ? createAnthropic({ apiKey: apiKeys.anthropic as string }) 
    : null;
    
  const googleInstance = apiKeys.google 
    ? createGoogleGenerativeAI({ apiKey: apiKeys.google as string }) 
    : null;
    
  return {
    openai: openaiInstance ? (modelId: string) => openaiInstance(modelId) : null,
    anthropic: anthropicInstance ? (modelId: string) => anthropicInstance(modelId) : null,
    google: googleInstance ? (modelId: string) => googleInstance(modelId) : null
  };
} 