import OpenAI from "openai"
import AnthropicClient from "@anthropic-ai/sdk"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { ChatCompletionMessageParam, ChatCompletionCreateParamsBase, ChatCompletion } from "openai/resources/chat/completions"
import axios from "axios"
import { ollama } from "./ollama-client"
import { ElectronAPI } from "../types/electron"

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
  provider: "openai" | "anthropic" | "google" | "deepseek"
  modelId: string
  maxTokens: number
  reasoning_effort?: "low" | "medium" | "high"
  isVisionModel?: boolean
  thinking?: {
    type: string
    budget_tokens: number
  }
}

// Vision-capable models
const visionModelsList: AIModel[] = [
  {
    id: "claude-3-7-sonnet-vision",
    name: "Claude 3.7 Sonnet",
    description: "Excellent Vision | 2150 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    isVisionModel: true
  },
  {
    id: "claude-3-7-sonnet-vision-thinking-high",
    name: "Claude 3.7 Sonnet Thinking (high)",
    description: "Outstanding Vision | 2300 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    isVisionModel: true,
    thinking: {
      type: "enabled",
      budget_tokens: 4096
    }
  },
  {
    id: "claude-3-7-sonnet-vision-thinking-medium",
    name: "Claude 3.7 Sonnet Thinking (medium)",
    description: "Superior Vision | 2250 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    isVisionModel: true,
    thinking: {
      type: "enabled",
      budget_tokens: 2048
    }
  },
  {
    id: "claude-3-7-sonnet-vision-thinking-low",
    name: "Claude 3.7 Sonnet Thinking (low)",
    description: "Great Vision | 2200 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    isVisionModel: true,
    thinking: {
      type: "enabled",
      budget_tokens: 1024
    }
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Default | 808 CF Elo.",
    provider: "openai",
    modelId: "gpt-4o",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gpt-4.5-vision",
    name: "GPT-4.5",
    description: "Latest OpenAI | ~2100 CF Elo.",
    provider: "openai",
    modelId: "gpt-4.5-preview",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "o1",
    name: "o1",
    description: "Expensive | 1891 CF Elo.",
    provider: "openai",
    modelId: "o1",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Latest | ~1000 CF Elo.",
    provider: "google",
    modelId: "gemini-2.0-flash",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gemini-2-thinking",
    name: "Gemini 2.0 Flash Thinking",
    description: "Not working | ~1400 CF Elo.",
    provider: "google",
    modelId: "gemini-2.0-flash-thinking-exp-01-21",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gemini-2-pro",
    name: "Gemini 2.0 Pro",
    description: "Not working | ~1200 CF Elo.",
    provider: "google",
    modelId: "gemini-2.0-pro-exp-02-05",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gemini-2.0-flash-lite-preview-02-05",
    name: "Gemini 2.0 Flash Lite Preview",
    description: "Fast AF | ~1000 CF Elo.",
    provider: "google",
    modelId: "gemini-2.0-flash-lite-preview-02-05",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Not recommended | ~400 CF Elo.",
    provider: "openai",
    modelId: "gpt-4o-mini",
    maxTokens: 4096,
    isVisionModel: true
  },
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet v2",
    description: "Smart, but expensive | 717 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-latest",
    maxTokens: 4096,
    isVisionModel: true
  }
]

// Regular models
const regularModelsList: AIModel[] = [
  {
    id: "claude-3-7-sonnet-latest",
    name: "Claude 3.7 Sonnet",
    description: "Excellent | 2150 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333
  },
  {
    id: "claude-3-7-sonnet-thinking-high",
    name: "Claude 3.7 Sonnet Thinking (high)",
    description: "Outstanding | 2300 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    thinking: {
      type: "enabled",
      budget_tokens: 4096
    }
  },
  {
    id: "claude-3-7-sonnet-thinking-medium",
    name: "Claude 3.7 Sonnet Thinking (medium)",
    description: "Superior | 2250 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    thinking: {
      type: "enabled",
      budget_tokens: 2048
    }
  },
  {
    id: "claude-3-7-sonnet-thinking-low",
    name: "Claude 3.7 Sonnet Thinking (low)",
    description: "Great | 2200 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-7-sonnet-20250219",
    maxTokens: 21_333,
    thinking: {
      type: "enabled",
      budget_tokens: 1024
    }
  },
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet v2",
    description: "Very Good | 2100 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-5-sonnet-20240620",
    maxTokens: 21_333
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    description: "Fast | 1950 CF Elo.",
    provider: "anthropic",
    modelId: "claude-3-5-haiku-20240620",
    maxTokens: 21_333
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    description: "Decent | 1650 CF Elo.",
    provider: "openai",
    modelId: "o1-mini",
    maxTokens: 4096
  },
  {
    id: "o3-mini-low",
    name: "o3-mini (low)",
    description: "Quick | 1697 CF Elo.",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "low"
  },
  {
    id: "o3-mini-medium",
    name: "o3-mini (medium)",
    description: "Balanced | 1997 CF Elo.",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "medium"
  },
  {
    id: "o3-mini-high",
    name: "o3-mini (high)",
    description: "Best | 2073 CF Elo.",
    provider: "openai",
    modelId: "o3-mini",
    maxTokens: 4096,
    reasoning_effort: "high"
  },
  {
    id: "gpt-4.5",
    name: "GPT-4.5",
    description: "Latest OpenAI | ~2100 CF Elo.",
    provider: "openai",
    modelId: "gpt-4.5-preview",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1",
    name: "DeepSeek R1",
    description: "Smart, but slow | 2029 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-1.5b",
    name: "DeepSeek R1 (Distill 1.5B)",
    description: "Tiny | 954 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-1.5b",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-7b",
    name: "DeepSeek R1 (Distill 7B)",
    description: "Small | 1189 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-7b",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-14b",
    name: "DeepSeek R1 (Distill 14B)",
    description: "Medium | 1481 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-14b",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-32b",
    name: "DeepSeek R1 (Distill 32B)",
    description: "Large | 1691 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-32b",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-8b",
    name: "DeepSeek R1 (Distill 8B)",
    description: "Small+ | 1205 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-8b",
    maxTokens: 4096
  },
  {
    id: "deepseek-r1-distill-70b",
    name: "DeepSeek R1 (Distill 70B)",
    description: "Huge | 1633 CF Elo.",
    provider: "deepseek",
    modelId: "deepseek-r1-distill-70b",
    maxTokens: 4096
  }
]

// Combined models array with both regular and vision models
export const models: AIModel[] = [...regularModelsList, ...visionModelsList]

// Export vision models for backward compatibility
export const visionModels = visionModelsList

// Helper function to get vision models
export const getVisionModels = () => models.filter(model => model.isVisionModel)

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
    }).catch(error => {
      console.error('Failed to initialize AI clients:', error)
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
      messages: typedMessages,
      temperature: 0.7
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

    // Properly format messages for Claude's API
    const formattedMessages = messages.map(message => {
      const role = message.role === 'system' ? 'user' : message.role as 'user' | 'assistant'
      
      if (typeof message.content === 'string') {
        return { role, content: message.content }
      }
      
      // Handle array of content (text + images)
      if (Array.isArray(message.content)) {
        return {
          role,
          content: message.content.map(item => {
            if (item.type === 'text') {
              return { type: 'text', text: item.text }
            } else if (item.type === 'image_url') {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/png',
                  data: item.image_url.url.split(',')[1] // Remove the data:image/png;base64, prefix
                }
              }
            }
            return item
          })
        }
      }
      
      return { role, content: JSON.stringify(message.content) }
    })

    const response = await this.anthropic.messages.create({
      model: model.modelId,
      max_tokens: model.maxTokens,
      messages: formattedMessages,
      system: options.systemPrompt
    })

    if (!response.content.length) {
      throw new Error("Empty response from Anthropic API")
    }

    const firstContent = response.content[0]
    
    if (firstContent.type !== 'text') {
      throw new Error(`Expected text response, got ${firstContent.type}`)
    }

    const textContent = firstContent as { type: 'text'; text: string }
    
    // For Claude models with system prompt, ensure the response starts with { and ends with }
    if (options.systemPrompt) {
      let responseText = textContent.text.trim()
      if (!responseText.startsWith('{')) {
        responseText = '{' + responseText
      }
      if (!responseText.endsWith('}')) {
        responseText = responseText + '}'
      }
      return {
        content: responseText,
        _request_id: response.id
      }
    }
    
    return {
      content: textContent.text,
      _request_id: response.id
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
    options: { signal?: AbortSignal } = {}
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
      return this.callOpenAIApi(modelId, messages, {
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
        
        // For Claude models, determine the task type and use appropriate system message
        let systemMessage
        if (isClaudeModel(model.modelId)) {
          const lastMessage = messages[messages.length - 1]
          const lastContent = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content[0]?.text
          
          if (lastContent.includes('Extract the coding problem')) {
            systemMessage = getClaudeSystemMessage('extract')
          } else if (lastContent.includes('Generate a solution')) {
            systemMessage = getClaudeSystemMessage('solve')
          } else if (lastContent.includes('Debug this code')) {
            systemMessage = getClaudeSystemMessage('debug')
          }
        }

        return this.callAnthropicApi(model, messages, { 
          signal: options.signal, 
          systemPrompt: systemMessage 
        })
      }

      case "google": {
        return this.callGoogleApi(modelId, messages, options)
      }

      case "deepseek": {
        return this.callDeepseekApi(model, messages, options)
      }

      default:
        throw new Error(`Unknown provider: ${model.provider}`)
    }
  }
}

// Export a function to create the manager instead of a singleton instance
export function createAIManager(store?: any) {
  return new AIModelManager(store)
}

// For backwards compatibility in renderer process
export const aiManager = typeof window !== 'undefined' ? new AIModelManager() : null