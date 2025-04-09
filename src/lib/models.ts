import OpenAI from "openai"
import AnthropicClient from "@anthropic-ai/sdk"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { ChatCompletionMessageParam, ChatCompletionCreateParamsBase, ChatCompletion } from "openai/resources/chat/completions"
import axios from "axios"
import { ollama } from "./ollama-client"
import { ElectronAPI } from "../types/electron"
import { generateText, generateObject } from "ai"
import { createAISDKClients } from "./ai-sdk-clients"

// Import centralized schemas
import { 
  problemExtractionSchema as configProblemExtractionSchema,
  problemSchema, 
  detailedSolutionSchema, 
  detailedDebugSchema,
  getSchemaForTask as configGetSchemaForTask,
  getGeminiSchemaForTask as configGetGeminiSchemaForTask
} from "./config/schemas"

// Declare global window property with electronAPI
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export interface AIModel {
  id: string
  name: string
  description: string
  provider: "openai" | "anthropic" | "google" | "deepseek" | "meta" | "deepgram"
  modelId: string
  maxTokens: number
  reasoning_effort?: "low" | "medium" | "high"
  isVisionModel?: boolean
  isSTTModel?: boolean
  thinking?: {
    type: string
    budget_tokens: number
  }
  useSearchGrounding?: boolean
}

// Single source of truth for all models
export const allModels: AIModel[] = [
  // Claude Models
  {
    id: "claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    description: "Superior | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-latest",
    maxTokens: 21333,
    isVisionModel: true
  },
  {
    id: "claude-3-7-sonnet-thinking-high",
    name: "Claude 3.7 Sonnet Thinking (high)",
    description: "Outstanding | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-latest",
    maxTokens: 21333,
    thinking: {
      type: "enabled",
      budget_tokens: 4096
    },
    isVisionModel: true
  },
  {
    id: "claude-3-7-sonnet-thinking-medium",
    name: "Claude 3.7 Sonnet Thinking (medium)",
    description: "Excellent | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-latest",
    maxTokens: 21333,
    thinking: {
      type: "enabled",
      budget_tokens: 2048
    },
    isVisionModel: true
  },
  {
    id: "claude-3-7-sonnet-thinking-low",
    name: "Claude 3.7 Sonnet Thinking (low)",
    description: "Premium | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-latest",
    maxTokens: 21333,
    thinking: {
      type: "enabled",
      budget_tokens: 1024
    },
    isVisionModel: true
  },
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet v2",
    description: "Advanced | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-latest",
    maxTokens: 21333,
    isVisionModel: true
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    description: "Fast | ??? CF Elo",
    provider: "anthropic",
    modelId: "claude-3-5-haiku-latest",
    maxTokens: 21333,
    isVisionModel: true
  },

  // OpenAI Models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Standard | 808 CF Elo",
    provider: "openai",
    modelId: "gpt-4o",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gpt-4.5",
    name: "GPT-4.5",
    description: "Latest | 850 CF Elo",
    provider: "openai",
    modelId: "gpt-4.5-preview",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "o1",
    name: "o1",
    description: "Expensive | 1891 CF Elo",
    provider: "openai",
    modelId: "o1",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "o1-pro",
    name: "o1-pro",
    description: "Unknown | ??? CF Elo",
    provider: "openai",
    modelId: "o1-pro",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "o3-mini-low",
    name: "o3-mini (low)",
    description: "Quick | 1697 CF Elo",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "low",
    isVisionModel: false
  },
  {
    id: "o3-mini-medium",
    name: "o3-mini (medium)",
    description: "Balanced | 1997 CF Elo",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "medium",
    isVisionModel: false
  },
  {
    id: "o3-mini-high",
    name: "o3-mini (high)",
    description: "Superior | 2073 CF Elo",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "high",
    isVisionModel: false
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Affordable | 750 CF Elo",
    provider: "openai",
    modelId: "gpt-4o-mini",
    maxTokens: 4096,
    isVisionModel: true
  },

  // Google Models
  {
    id: "gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro Preview",
    description: "Thinking | ??? CF Elo",
    provider: "google",
    modelId: "gemini-2.5-pro-preview-03-25",
    maxTokens: 65536,
    isVisionModel: true
  },
  {
    id: "gemini-2.5-pro-exp",
    name: "Gemini 2.5 Pro Experimental",
    description: "Experimental | ??? CF Elo",
    provider: "google",
    modelId: "gemini-2.5-pro-exp-03-25",
    maxTokens: 65536,
    isVisionModel: true
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Versatile | ??? CF Elo",
    provider: "google",
    modelId: "gemini-2.0-flash",
    maxTokens: 8192,
    isVisionModel: true
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Efficient | ??? CF Elo",
    provider: "google",
    modelId: "gemini-2.0-flash-lite",
    maxTokens: 8192,
    isVisionModel: true
  },

  // DeepSeek Models
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    description: "Smart, but slow | 2029 CF Elo",
    provider: "deepseek",
    modelId: "deepseek-r1",
    maxTokens: 4096,
    isVisionModel: false
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    description: "Improved | ??? CF Elo",
    provider: "deepseek",
    modelId: "deepseek-v3",
    maxTokens: 4096,
    isVisionModel: true
  },
  
  // Llama Models
  {
    id: "llama-3.3",
    name: "Llama 3.3",
    description: "Fast | ??? CF Elo",
    provider: "meta",
    modelId: "llama:3.3",
    maxTokens: 4096,
    isVisionModel: false
  },
  {
    id: "llama-4-scout",
    name: "Llama 4 Scout",
    description: "Lightweight | ??? CF Elo",
    provider: "meta",
    modelId: "llama:4-scout",
    maxTokens: 8192,
    isVisionModel: false
  },
  {
    id: "llama-4-maverick",
    name: "Llama 4 Maverick",
    description: "Powerful | ??? CF Elo",
    provider: "meta",
    modelId: "llama:4-maverick",
    maxTokens: 8192,
    isVisionModel: true
  },

  // OpenAI STT Models
  {
    id: "whisper-1",
    name: "Whisper-1",
    description: "General-purpose speech recognition model",
    provider: "openai",
    modelId: "whisper-1",
    maxTokens: 4096,
    isSTTModel: true
  },
  {
    id: "gpt-4o-transcribe",
    name: "GPT-4o Transcribe",
    description: "Speech-to-text model powered by GPT-4o",
    provider: "openai",
    modelId: "gpt-4o-transcribe",
    maxTokens: 4096,
    isSTTModel: true
  },
  {
    id: "gpt-4o-mini-transcribe",
    name: "GPT-4o mini Transcribe",
    description: "Speech-to-text model powered by GPT-4o mini",
    provider: "openai",
    modelId: "gpt-4o-mini-transcribe",
    maxTokens: 4096,
    isSTTModel: true
  },
  
  // Deepgram STT Models
  {
    id: "deepgram-nova-3",
    name: "Nova-3",
    description: "Deepgram Nova-3 STT model",
    provider: "deepgram",
    modelId: "nova-3",
    maxTokens: 0,
    isSTTModel: true
  },
  {
    id: "deepgram-nova-2",
    name: "Nova-2",
    description: "Deepgram Nova-2 STT model",
    provider: "deepgram",
    modelId: "nova-2",
    maxTokens: 0,
    isSTTModel: true
  },
]

// Export all models as the main models array
export const models = allModels

// Debug logging for all models
console.log("===== MODEL DEBUGGING =====")
console.log("All models count:", allModels.length)
console.log("All Google models:", allModels.filter(m => m.provider === "google").map(m => m.id))

// Helper function to get vision models
export const getVisionModels = () => {
  const visionModels = models.filter(model => model.isVisionModel)
  console.log("Vision models count:", visionModels.length) 
  console.log("Vision Google models:", visionModels.filter(m => m.provider === "google").map(m => m.id))
  return visionModels
}

// Export vision models list for backward compatibility
export const visionModels = getVisionModels()

// Log model distribution by provider
console.log("Models by provider:", {
  google: models.filter(m => m.provider === "google").length,
  openai: models.filter(m => m.provider === "openai").length,
  anthropic: models.filter(m => m.provider === "anthropic").length,
  deepseek: models.filter(m => m.provider === "deepseek").length,
  meta: models.filter(m => m.provider === "meta").length,
  deepgram: models.filter(m => m.provider === "deepgram").length
})

// Enhanced debugging for Google models specifically
console.log("Google models detail:", models
  .filter(m => m.provider === "google")
  .map(m => ({
    id: m.id,
    name: m.name,
    isVisionModel: m.isVisionModel,
    provider: m.provider
  }))
)

console.log("===== END MODEL DEBUGGING =====")

export interface AIResponse {
  content: string
  _request_id?: string
}

// Re-export schemas from our centralized configuration
export const problemExtractionSchema = configProblemExtractionSchema;
export const solutionSchema = detailedSolutionSchema;
export const debugSchema = detailedDebugSchema;

// Function to check if a model needs structured output
export function needsStructuredOutput(modelId: string): boolean {
  return modelId.startsWith("gpt-") || modelId.startsWith("o")
}

// Function to get the appropriate schema based on the task
export function getSchemaForTask(task: 'extract' | 'solve' | 'debug'): any {
  return configGetSchemaForTask(task);
}

// Function to check if a model is Claude
function isClaudeModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('claude')
}

// Function to get Claude-specific system message for JSON output
function getClaudeSystemMessage(task: 'extract' | 'solve' | 'debug'): string {
  const schema = getSchemaForTask(task)
  return `You are a coding assistant that provides responses in JSON format.

Important Instructions for JSON Output:
1. Your response MUST be valid JSON matching this schema: ${JSON.stringify(schema, null, 2)}
2. Do not include ANY explanatory text outside the JSON
3. Ensure all required fields from the schema are present
4. Format code with proper escaping
5. Begin your response with a curly brace {
6. End your response with a curly brace }
`
}

function getGeminiSchemaForTask(task: 'extract' | 'solve' | 'debug'): any {
  return configGetGeminiSchemaForTask(task);
}

export class AIModelManager {
  private openai: OpenAI | null = null
  private anthropic: AnthropicClient | null = null
  private google: GoogleGenerativeAI | null = null
  private deepseekApiKey: string | null = null
  private metaApiKey: string | null = null
  private initialized: boolean = false
  private isMainProcess: boolean
  private store: any

  constructor(store?: any) {
    this.isMainProcess = typeof window === 'undefined'
    this.store = store
    
    if (this.isMainProcess && !store) {
      throw new Error('Store must be provided in main process')
    }
    
    this.initializeClients().then(() => {
      this.initialized = true
      
      // Run a quick verification of the AI SDK
      this.verifyAISDK().then(({ isSDKWorking, results }) => {
        console.log(`Vercel AI SDK functioning: ${isSDKWorking}`, results)
      }).catch(error => {
        console.error('Error verifying AI SDK:', error)
      })
    }).catch(error => {
      console.error('Error initializing AI clients:', error)
    })
  }

  private async initializeClients() {
    try {
      let apiKeys
      
      if (this.isMainProcess) {
        // In main process, use store directly
        apiKeys = this.store.get('apiKeys')
      } else {
        // In renderer process, use electronAPI
        apiKeys = await window.electronAPI.getApiKeys()
      }
      
      if (apiKeys.openai) {
        this.openai = new OpenAI({ apiKey: apiKeys.openai })
      }
      if (apiKeys.anthropic) {
        this.anthropic = new AnthropicClient({ apiKey: apiKeys.anthropic })
      }
      if (apiKeys.google) {
        this.google = new GoogleGenerativeAI(apiKeys.google)
      }
      if (apiKeys.deepseek) {
        this.deepseekApiKey = apiKeys.deepseek
      }
      if (apiKeys.meta) {
        this.metaApiKey = apiKeys.meta
      }
    } catch (error) {
      console.error('Failed to initialize AI clients:', error)
    }
  }

  public async reinitializeClients() {
    await this.initializeClients()
  }

  private async callDeepseekApi(model: AIModel, messages: Array<{ role: string; content: any }>, options: { signal?: AbortSignal } = {}) {
    if (!this.deepseekApiKey) {
      throw new Error("DeepSeek API key not initialized")
    }

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: model.modelId,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })),
        max_tokens: model.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: options.signal
      }
    )

    if (!response.data.choices?.[0]?.message?.content) {
      throw new Error("Empty response from DeepSeek API")
    }

    return {
      content: response.data.choices[0].message.content,
      _request_id: response.data.id
    }
  }

  private async callOpenAIApi(
    modelId: string,
    messages: Array<{ role: string; content: any }>,
    options: { signal?: AbortSignal; response_format?: any } = {}
  ): Promise<AIResponse> {
    if (!this.openai) {
      throw new Error("OpenAI client not initialized")
    }

    const typedMessages = messages.map(msg => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content
    }))

    const requestOptions: OpenAI.Chat.ChatCompletionCreateParams = {
      model: modelId,
      messages: typedMessages
    }
    
    // Only add temperature for non-'o' models (o1, o3-mini, etc. don't support it)
    if (!modelId.startsWith('o')) {
      requestOptions.temperature = 0.7
    }

    // Only add response_format if we're using a model that supports it
    if (modelId.startsWith('gpt-') || modelId.startsWith('o')) {
      if (options.response_format) {
        requestOptions.response_format = options.response_format;
      } else {
        const lastMessage = messages[messages.length - 1]
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text
        
        let schema = null
        if (content.includes('Extract the coding problem')) {
          schema = getSchemaForTask('extract')
        } else if (content.includes('Generate a solution')) {
          schema = getSchemaForTask('solve')
        } else if (content.includes('Debug this code')) {
          schema = getSchemaForTask('debug')
        }

        if (schema) {
          requestOptions.response_format = {
            type: "json_object"
          }
        }
      }
    }

    const response = await this.openai.chat.completions.create(
      requestOptions,
      { signal: options.signal }
    ) as ChatCompletion

    return {
      content: response.choices[0]?.message?.content || "",
      _request_id: response.id
    }
  }

  private async callGoogleApi(
    modelId: string,
    messages: Array<{ role: string; content: any }>,
    options: { signal?: AbortSignal } = {}
  ): Promise<AIResponse> {
    if (!this.google) {
      throw new Error("Google API client not initialized")
    }

    const model = this.google.getGenerativeModel({ 
      model: modelId,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: getGeminiSchemaForTask(
          messages[0].content.includes("Debug this code") ? "debug" :
          messages[0].content.includes("Extract the coding problem") ? "extract" : "solve"
        )
      }
    })

    try {
      const result = await model.generateContent({
        contents: messages.map(msg => ({
          role: msg.role === "system" ? "user" : msg.role,
          parts: [{ text: msg.content }]
        }))
      })

      return {
        content: result.response.text(),
        _request_id: ""
      }
    } catch (error: any) {
      console.error("Google API error:", error)
      throw new Error(error.message || "Error calling Google API")
    }
  }

  private async callAnthropicApi(
    model: AIModel,
    messages: Array<{ role: string; content: any }>,
    options: { signal?: AbortSignal; systemPrompt?: string } = {}
  ): Promise<AIResponse> {
    if (!this.anthropic) {
      throw new Error("Anthropic client not initialized")
    }

    try {
      // First attempt to use Vercel AI SDK
      const apiKeys = {
        openai: null,
        anthropic: this.anthropic ? this.anthropic.apiKey : null,
        google: null
      };
      
      const clients = createAISDKClients(apiKeys);
      
      if (clients.anthropic) {
        // Check if we need structured output
        const lastMessage = messages[messages.length - 1];
        const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
        let needsStructuredOutput = false;
        let schema = null;
        
        if (content) {
          if (content.includes('Extract the coding problem')) {
            schema = getSchemaForTask('extract');
            needsStructuredOutput = true;
          } else if (content.includes('Generate a solution')) {
            schema = getSchemaForTask('solve');
            needsStructuredOutput = true;
          } else if (content.includes('Debug this code')) {
            schema = getSchemaForTask('debug');
            needsStructuredOutput = true;
          }
        }
        
        // Get appropriate system message based on task
        let systemMessage = "";
        if (isClaudeModel(model.modelId)) {
          if (content) {
            if (content.includes('Extract the coding problem')) {
              systemMessage = getClaudeSystemMessage('extract');
            } else if (content.includes('Generate a solution')) {
              systemMessage = getClaudeSystemMessage('solve');
            } else if (content.includes('Debug this code')) {
              systemMessage = getClaudeSystemMessage('debug');
            }
          }
        }
        
        // Combine messages into a single prompt
        const userMessages = messages.map(m => {
          const content = typeof m.content === 'string' 
            ? m.content 
            : Array.isArray(m.content) 
              ? m.content.map(c => typeof c === 'object' && c.text ? c.text : typeof c === 'string' ? c : '').join("\n")
              : '';
          return content;
        }).join("\n\n");
        
        // For structured output with Anthropic
        if (needsStructuredOutput && schema) {
          try {
            const result = await generateObject({
              model: clients.anthropic(model.modelId),
              // Vercel AI SDK uses a different approach to define schema for non-OpenAI models
              // It automatically handles schema transformation
              schema: schema,
              prompt: userMessages,
              system: systemMessage
            });
            
            return {
              content: JSON.stringify(result),
              _request_id: `ai-sdk-${Date.now()}`
            };
          } catch (error) {
            console.error("Error using Vercel AI SDK generateObject for Anthropic:", error);
            // Continue to fallback
          }
        } 
        // For regular completions
        else {
          try {
            const { text } = await generateText({
              model: clients.anthropic(model.modelId),
              prompt: userMessages,
              system: systemMessage
            });
            
            return {
              content: text,
              _request_id: `ai-sdk-${Date.now()}`
            };
          } catch (error) {
            console.error("Error using Vercel AI SDK generateText for Anthropic:", error);
            // Continue to fallback
          }
        }
      }
    } catch (error) {
      console.error("Error using Vercel AI SDK for Anthropic, falling back to native API:", error);
      // Fall back to original implementation
    }
    
    // Fallback to original implementation
    // For Claude models, determine the task type and use appropriate system message
    let systemMessage;
    if (isClaudeModel(model.modelId)) {
      const lastMessage = messages[messages.length - 1];
      const lastContent = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
      
      if (lastContent.includes('Extract the coding problem')) {
        systemMessage = getClaudeSystemMessage('extract');
      } else if (lastContent.includes('Generate a solution')) {
        systemMessage = getClaudeSystemMessage('solve');
      } else if (lastContent.includes('Debug this code')) {
        systemMessage = getClaudeSystemMessage('debug');
      }
    }

    return this.callAnthropicApi(model, messages, { 
      signal: options.signal, 
      systemPrompt: systemMessage 
    });
  }

  // Add implementation for Meta API
  private async callMetaApi(model: AIModel, messages: Array<{ role: string; content: any }>, options: { signal?: AbortSignal } = {}) {
    if (!this.metaApiKey) {
      throw new Error("Meta API key not initialized")
    }

    const response = await axios.post(
      'https://api.meta.com/v1/chat/completions',
      {
        model: model.modelId,
        messages: messages.map(m => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
        })),
        max_tokens: model.maxTokens,
      },
      {
        headers: {
          'Authorization': `Bearer ${this.metaApiKey}`,
          'Content-Type': 'application/json',
        },
        signal: options.signal
      }
    )

    if (!response.data.choices?.[0]?.message?.content) {
      throw new Error("Empty response from Meta API")
    }

    return {
      content: response.data.choices[0].message.content,
      _request_id: response.data.id
    }
  }

  /**
   * Generate a completion using the appropriate AI model
   * @param modelId ID of the model to use
   * @param messages Array of message objects to send to the AI
   * @param options Optional parameters including signal for abort controller
   * @returns Promise with the AI response
   */
  async generateCompletion(
    modelId: string,
    messages: Array<{ role: string; content: any }>,
    options: { signal?: AbortSignal; useSearch?: boolean } = {}
  ): Promise<AIResponse> {
    if (!this.initialized) {
      await this.initializeClients()
    }

    // Handle Ollama models
    if (modelId.includes(':') || modelId.startsWith('deepseek-coder')) {
      try {
        const response = await ollama.chat({
          model: modelId,
          messages,
          stream: false
        })
        return { content: response.message.content }
      } catch (error) {
        console.error('Ollama completion error:', error)
        throw error
      }
    }

    // Determine if we need structured output
    const useStructuredOutput = needsStructuredOutput(modelId)
    
    // If using structured output, determine the task and get the schema
    let schema = null
    if (useStructuredOutput) {
      const lastMessage = messages[messages.length - 1]
      const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text
      
      if (content.includes('Extract the coding problem')) {
        schema = getSchemaForTask('extract')
      } else if (content.includes('Generate a solution')) {
        schema = getSchemaForTask('solve')
      } else if (content.includes('Debug this code')) {
        schema = getSchemaForTask('debug')
      }
    }

    // Add the schema to the OpenAI API call if needed
    if (useStructuredOutput && schema) {
      // Find the model first to get the correct modelId
      const model = models.find((m) => m.id === modelId)
      if (!model) throw new Error(`Model ${modelId} not found`)
      
      return this.callOpenAIApi(model.modelId, messages, {
        ...options,
        response_format: { type: "json_object" }
      })
    }

    // Search in both regular and vision models arrays
    const model = models.find((m) => m.id === modelId)
    if (!model) throw new Error(`Model ${modelId} not found`)

    switch (model.provider) {
      case "openai": {
        if (!this.openai) throw new Error("OpenAI client not initialized")
        
        try {
          // First attempt to use Vercel AI SDK
          const apiKeys = {
            openai: this.openai ? this.openai.apiKey : null,
            anthropic: null,
            google: null
          };
          
          const clients = createAISDKClients(apiKeys);
          
          if (clients.openai) {
            // Only include reasoning_effort for "o" models
            const isOModel = model.modelId.startsWith('o');
            const aiOptions: any = {};
            
            if (isOModel && model.reasoning_effort) {
              aiOptions.reasoning_effort = model.reasoning_effort;
            }
            
            // Check if we need structured output
            const lastMessage = messages[messages.length - 1];
            const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
            let needsStructuredOutput = false;
            let schema = null;
            
            if (content) {
              if (content.includes('Extract the coding problem')) {
                schema = getSchemaForTask('extract');
                needsStructuredOutput = true;
              } else if (content.includes('Generate a solution')) {
                schema = getSchemaForTask('solve');
                needsStructuredOutput = true;
              } else if (content.includes('Debug this code')) {
                schema = getSchemaForTask('debug');
                needsStructuredOutput = true;
              }
            }
            
            // Prepare the prompt
            // Add developer role message for OpenAI models
            const developerMessage = "You are a coding assistant that provides precise, accurate responses.";
            
            // Combine messages into a single prompt
            const prompt = developerMessage + "\n\n" + messages.map(m => {
              const role = m.role === 'system' ? 'developer' : m.role;
              const content = typeof m.content === 'string' 
                ? m.content 
                : Array.isArray(m.content) 
                  ? m.content.map(c => typeof c === 'object' && c.text ? c.text : typeof c === 'string' ? c : '').join("\n")
                  : '';
              return `${role}: ${content}`;
            }).join("\n\n");
            
            // For structured output
            if (needsStructuredOutput && schema) {
              try {
                const result = await generateObject({
                  model: clients.openai(model.modelId),
                  schema,
                  prompt,
                  ...aiOptions
                });
                
                return {
                  content: JSON.stringify(result),
                  _request_id: `ai-sdk-${Date.now()}`
                };
              } catch (error) {
                console.error("Error using Vercel AI SDK generateObject for OpenAI:", error);
                // Continue to fallback
              }
            } 
            // For regular completions
            else {
              try {
                const { text } = await generateText({
                  model: clients.openai(model.modelId),
                  prompt,
                  ...aiOptions
                });
                
                return {
                  content: text,
                  _request_id: `ai-sdk-${Date.now()}`
                };
              } catch (error) {
                console.error("Error using Vercel AI SDK generateText for OpenAI:", error);
                // Continue to fallback
              }
            }
          }
        } catch (error) {
          console.error("Error using Vercel AI SDK, falling back to native API:", error);
          // Fall back to original implementation
        }
        
        // Fallback to original implementation
        // Add developer role message for OpenAI models
        const developerMessage: ChatCompletionMessageParam = {
          role: "developer",
          content: "You are a coding assistant that provides precise, accurate responses."
        }

        // Convert messages to OpenAI format and add developer message
        const openaiMessages: ChatCompletionMessageParam[] = [
          developerMessage,
          ...messages.map(m => {
            if (m.role === 'function') {
              return {
                role: m.role,
                content: m.content,
                name: 'default_function' // Add name for function messages
              } as ChatCompletionMessageParam
            }
            return {
              role: m.role === "system" ? "developer" : m.role as "user" | "assistant",
              content: m.content
            } as ChatCompletionMessageParam
          })
        ]

        // Only include reasoning_effort for "o" models
        const isOModel = model.modelId.startsWith('o')
        const requestOptions: any = {
          model: model.modelId,
          messages: openaiMessages,
          max_tokens: model.maxTokens
        }

        if (isOModel && model.reasoning_effort) {
          requestOptions.reasoning_effort = model.reasoning_effort
        }

        const response = await this.openai.chat.completions.create(requestOptions)
        return {
          content: response.choices[0].message.content || "",
          _request_id: response.id
        }
      }

      case "anthropic": {
        if (!this.anthropic) throw new Error("Anthropic client not initialized")
        
        try {
          // First attempt to use Vercel AI SDK
          const apiKeys = {
            openai: null,
            anthropic: this.anthropic ? this.anthropic.apiKey : null,
            google: null
          };
          
          const clients = createAISDKClients(apiKeys);
          
          if (clients.anthropic) {
            // Check if we need structured output
            const lastMessage = messages[messages.length - 1];
            const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
            let needsStructuredOutput = false;
            let schema = null;
            
            if (content) {
              if (content.includes('Extract the coding problem')) {
                schema = getSchemaForTask('extract');
                needsStructuredOutput = true;
              } else if (content.includes('Generate a solution')) {
                schema = getSchemaForTask('solve');
                needsStructuredOutput = true;
              } else if (content.includes('Debug this code')) {
                schema = getSchemaForTask('debug');
                needsStructuredOutput = true;
              }
            }
            
            // Get appropriate system message based on task
            let systemMessage = "";
            if (isClaudeModel(model.modelId)) {
              if (content) {
                if (content.includes('Extract the coding problem')) {
                  systemMessage = getClaudeSystemMessage('extract');
                } else if (content.includes('Generate a solution')) {
                  systemMessage = getClaudeSystemMessage('solve');
                } else if (content.includes('Debug this code')) {
                  systemMessage = getClaudeSystemMessage('debug');
                }
              }
            }
            
            // Combine messages into a single prompt
            const userMessages = messages.map(m => {
              const content = typeof m.content === 'string' 
                ? m.content 
                : Array.isArray(m.content) 
                  ? m.content.map(c => typeof c === 'object' && c.text ? c.text : typeof c === 'string' ? c : '').join("\n")
                  : '';
              return content;
            }).join("\n\n");
            
            // For structured output with Anthropic
            if (needsStructuredOutput && schema) {
              try {
                const result = await generateObject({
                  model: clients.anthropic(model.modelId),
                  // Vercel AI SDK uses a different approach to define schema for non-OpenAI models
                  // It automatically handles schema transformation
                  schema: schema,
                  prompt: userMessages,
                  system: systemMessage
                });
                
                return {
                  content: JSON.stringify(result),
                  _request_id: `ai-sdk-${Date.now()}`
                };
              } catch (error) {
                console.error("Error using Vercel AI SDK generateObject for Anthropic:", error);
                // Continue to fallback
              }
            } 
            // For regular completions
            else {
              try {
                const { text } = await generateText({
                  model: clients.anthropic(model.modelId),
                  prompt: userMessages,
                  system: systemMessage
                });
                
                return {
                  content: text,
                  _request_id: `ai-sdk-${Date.now()}`
                };
              } catch (error) {
                console.error("Error using Vercel AI SDK generateText for Anthropic:", error);
                // Continue to fallback
              }
            }
          }
        } catch (error) {
          console.error("Error using Vercel AI SDK for Anthropic, falling back to native API:", error);
          // Fall back to original implementation
        }
        
        // Fallback to original implementation
        // For Claude models, determine the task type and use appropriate system message
        let systemMessage;
        if (isClaudeModel(model.modelId)) {
          const lastMessage = messages[messages.length - 1];
          const lastContent = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
          
          if (lastContent.includes('Extract the coding problem')) {
            systemMessage = getClaudeSystemMessage('extract');
          } else if (lastContent.includes('Generate a solution')) {
            systemMessage = getClaudeSystemMessage('solve');
          } else if (lastContent.includes('Debug this code')) {
            systemMessage = getClaudeSystemMessage('debug');
          }
        }

        return this.callAnthropicApi(model, messages, { 
          signal: options.signal, 
          systemPrompt: systemMessage 
        });
      }

      case "google": {
        try {
          // First attempt to use Vercel AI SDK
          const apiKeys = {
            openai: null,
            anthropic: null,
            google: this.google ? (this.google as any).apiKey : null
          };
          
          const clients = createAISDKClients(apiKeys);
          
          if (clients.google) {
            // Check if we need structured output
            const lastMessage = messages[messages.length - 1];
            const content = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text;
            let needsStructuredOutput = false;
            let schema = null;
            
            if (content) {
              if (content.includes('Extract the coding problem')) {
                schema = getGeminiSchemaForTask('extract');
                needsStructuredOutput = true;
              } else if (content.includes('Generate a solution')) {
                schema = getGeminiSchemaForTask('solve');
                needsStructuredOutput = true;
              } else if (content.includes('Debug this code')) {
                schema = getGeminiSchemaForTask('debug');
                needsStructuredOutput = true;
              }
            }
            
            // Combine messages into a single prompt
            const prompt = messages.map(m => {
              const content = typeof m.content === 'string' 
                ? m.content 
                : Array.isArray(m.content) 
                  ? m.content.map(c => typeof c === 'object' && c.text ? c.text : typeof c === 'string' ? c : '').join("\n")
                  : '';
              return content;
            }).join("\n\n");
            
            // Get the model to determine if search grounding should be used
            const model = models.find(m => m.id === modelId);
            
            if (!model) {
              throw new Error(`Model ${modelId} not found`);
            }
            
            try {
              let modelOptions = {};
              
              // Set up search grounding if the model supports it or if useSearch is explicitly set to true
              if (model.useSearchGrounding || options.useSearch) {
                modelOptions = {
                  useSearchGrounding: true,
                  dynamicRetrievalConfig: {
                    mode: 'MODE_DYNAMIC',
                    dynamicThreshold: 0.8
                  }
                };
              }
              
              // Configure structured output if needed
              if (needsStructuredOutput) {
                Object.assign(modelOptions, { structuredOutputs: true });
              }
              
              // Generate text with the AI SDK
              const { text, sources, providerMetadata } = await generateText({
                model: clients.google(model.modelId, modelOptions),
                prompt: prompt
              });
              
              // If we have sources, append them to the response
              let formattedResponse = text;
              
              if (sources && sources.length > 0) {
                formattedResponse += "\n\n**Sources:**\n";
                sources.forEach((source, index) => {
                  formattedResponse += `[${index + 1}] ${source.title || source.url}: ${source.url}\n`;
                });
              }
              
              return {
                content: formattedResponse,
                _request_id: ""
              };
            } catch (error) {
              console.error("AI SDK error with Google model:", error);
              // Fall back to Google API client
              return this.callGoogleApi(model.modelId, messages, options);
            }
          } else {
            // Fall back to Google API client
            return this.callGoogleApi(model?.modelId || modelId, messages, options);
          }
        } catch (error: any) {
          console.error("Error with Google provider:", error);
          throw new Error(error.message || "Error with Google provider");
        }
      }

      case "deepseek": {
        return this.callDeepseekApi(model, messages, options)
      }

      case "meta": {
        return this.callMetaApi(model, messages, options)
      }

      default:
        throw new Error(`Unknown provider: ${model.provider}`)
    }
  }

  /**
   * Verifies that the Vercel AI SDK is working correctly
   * @returns Promise that resolves with the testing results
   */
  public async verifyAISDK(): Promise<{ isSDKWorking: boolean; results: Record<string, boolean> }> {
    if (!this.initialized) {
      await this.initializeClients();
    }
    
    const results: Record<string, boolean> = {
      openai: false,
      anthropic: false,
      google: false
    };
    
    try {
      // Get API keys
      let apiKeys: any;
      
      if (this.isMainProcess) {
        // In main process, use store directly
        apiKeys = this.store.get('apiKeys');
      } else {
        // In renderer process, use electronAPI
        apiKeys = await window.electronAPI.getApiKeys();
      }
      
      // Initialize clients
      const clients = createAISDKClients(apiKeys);
      
      // Test each provider
      if (clients.openai) {
        try {
          // Simple test for OpenAI
          const { text } = await generateText({
            model: clients.openai('gpt-3.5-turbo'),
            prompt: 'Say hello'
          });
          
          results.openai = !!text;
        } catch (error) {
          console.error('OpenAI AI SDK test failed:', error);
        }
      }
      
      if (clients.anthropic) {
        try {
          // Simple test for Anthropic
          const { text } = await generateText({
            model: clients.anthropic('claude-3-haiku-20240307'),
            prompt: 'Say hello'
          });
          
          results.anthropic = !!text;
        } catch (error) {
          console.error('Anthropic AI SDK test failed:', error);
        }
      }
      
      if (clients.google) {
        try {
          // Simple test for Google
          const { text } = await generateText({
            model: clients.google('gemini-1.5-flash'),
            prompt: 'Say hello'
          });
          
          results.google = !!text;
        } catch (error) {
          console.error('Google AI SDK test failed:', error);
        }
      }
      
      const isSDKWorking = Object.values(results).some(value => value);
      console.log('AI SDK verification results:', { isSDKWorking, results });
      
      return { isSDKWorking, results };
    } catch (error) {
      console.error('AI SDK verification failed:', error);
      return { isSDKWorking: false, results };
    }
  }
}

// Export a function to create the manager instead of a singleton instance
export function createAIManager(store?: any) {
  return new AIModelManager(store)
}

// For backwards compatibility in renderer process
export const aiManager = typeof window !== 'undefined' ? new AIModelManager() : null

// Utility functions to get models based on criteria
export function getSTTModels(): AIModel[] {
  return allModels.filter(model => model.isSTTModel);
}