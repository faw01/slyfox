import { AIModelManager } from "../src/lib/models"
import { StoreSchema } from "./store"
import Store from "electron-store"
import { BrowserWindow } from "electron"
import { createChatMessages } from "../src/lib/config/prompts/chat"

// Define the proper store type with get/set methods
type AppStore = Store<StoreSchema> & {
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

interface IChatHelperDeps {
  getMainWindow: () => BrowserWindow | null
  store: AppStore
  aiManager: AIModelManager
  getApiKey: (provider: string) => string | null
}

export class ChatHelper {
  private deps: IChatHelperDeps
  private isGeneratingResponse: boolean = false
  
  constructor(deps: IChatHelperDeps) {
    this.deps = deps
  }

  /**
   * Gets the currently selected chat model from the main window or falls back to main model
   * @returns The current model ID
   */
  private async getCurrentModel(requestedModel?: string): Promise<string> {
    // If a specific model is requested, use it
    if (requestedModel) {
      return requestedModel;
    }
    
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) {
      // Fall back to store if no window is available
      return this.deps.store.get('model')
    }

    try {
      // Get the chat model from the window global variable
      const chatModel = await mainWindow.webContents.executeJavaScript('window.__CHAT_MODEL__')
      
      if (typeof chatModel === 'string' && chatModel) {
        return chatModel
      } 
      
      // If no chat model is set, fall back to the main model
      const mainModel = await mainWindow.webContents.executeJavaScript('window.__MODEL__')
      if (typeof mainModel === 'string' && mainModel) {
        return mainModel
      }
      
      // Fall back to store if window globals aren't set
      return this.deps.store.get('model')
    } catch (error) {
      console.error('Error getting chat model:', error)
      // Fall back to store if there's an error
      return this.deps.store.get('model')
    }
  }

  /**
   * Generate an AI response to a chat message
   * @param options Object containing model, message, optional conversation history, and search toggle
   * @returns Object with success flag and either response data or error message
   */
  public async generateResponse(options: { 
    model: string; 
    message: string;
    history?: Array<{role: string; content: string}>;
    useSearch?: boolean;
  }): Promise<{ 
    success: boolean; 
    data?: string; 
    error?: string;
    sources?: Array<{title?: string; url: string}>;
  }> {
    if (this.isGeneratingResponse) {
      return { 
        success: false, 
        error: "Already generating a response, please wait" 
      }
    }

    if (!options.message || options.message.trim().length === 0) {
      return { 
        success: false, 
        error: "Message is empty" 
      }
    }

    try {
      this.isGeneratingResponse = true
      
      // Get main window
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) {
        throw new Error("No main window available")
      }
      
      // Get the current model from options, window.__CHAT_MODEL__ or fallbacks
      const currentModel = await this.getCurrentModel(options.model)
      
      // Check if we're using the chat model or a fallback
      try {
        const chatModel = await mainWindow.webContents.executeJavaScript('window.__CHAT_MODEL__')
        const mainModel = await mainWindow.webContents.executeJavaScript('window.__MODEL__')
        
        if (currentModel === chatModel) {
          console.log("Using dedicated chat model:", currentModel)
        } else if (currentModel === mainModel) {
          console.log("Using main model as fallback for chat:", currentModel)
        } else {
          console.log("Using store model as fallback for chat:", currentModel)
        }
      } catch (error) {
        console.log("Using model for chat response:", currentModel)
      }
      
      // Create messages, including history if provided
      const messages = createChatMessages(options.message, options.history);
      
      // Generate completion with the useSearch option if provided
      const response = await this.deps.aiManager.generateCompletion(
        currentModel, 
        messages, 
        { useSearch: options.useSearch }
      )
      
      if (!response || !response.content) {
        throw new Error("Failed to generate response")
      }
      
      // Check if the response includes sources (for search-grounded models)
      const sourceRegex = /\*\*Sources:\*\*\n(\[\d+\].*?(?:\n|$))+/;
      const sourceMatch = response.content.match(sourceRegex);
      
      let cleanedContent = response.content;
      let sources: Array<{title?: string; url: string}> = [];
      
      if (sourceMatch) {
        // Extract sources from the response
        const sourcesText = sourceMatch[0];
        
        // Parse sources from the text
        const sourceLines = sourcesText.split('\n').filter(line => line.trim().startsWith('['));
        
        sources = sourceLines.map(line => {
          // Extract title and URL
          const match = line.match(/\[\d+\]\s+(.*?):\s+(https?:\/\/.*?)(?:\s|$)/);
          if (match) {
            return {
              title: match[1],
              url: match[2]
            };
          }
          
          // If the format is different, try to at least extract the URL
          const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
          return {
            title: line.replace(/\[\d+\]\s+/, '').replace(/(https?:\/\/[^\s]+)/, '').trim(),
            url: urlMatch ? urlMatch[1] : ''
          };
        }).filter(source => source.url);
        
        // Remove sources section from the content to display
        cleanedContent = response.content.replace(sourceRegex, '').trim();
      }
      
      return {
        success: true,
        data: cleanedContent,
        sources: sources.length > 0 ? sources : undefined
      }
    } catch (error: any) {
      console.error("Error generating chat response:", error)
      return {
        success: false,
        error: error.message || "Failed to generate response"
      }
    } finally {
      this.isGeneratingResponse = false
    }
  }
} 