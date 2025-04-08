import { AIModelManager } from "../src/lib/models"
import { StoreSchema } from "./store"
import Store from "electron-store"
import { createTeleprompterMessages } from "../src/lib/config/prompts/teleprompter"
import { BrowserWindow } from "electron"

// Define the proper store type with get/set methods
type AppStore = Store<StoreSchema> & {
  get: <K extends keyof StoreSchema>(key: K) => StoreSchema[K]
  set: <K extends keyof StoreSchema>(key: K, value: StoreSchema[K]) => void
}

interface ITeleprompterHelperDeps {
  getMainWindow: () => BrowserWindow | null
  store: AppStore
  aiManager: AIModelManager
  getApiKey: (provider: string) => string | null
}

export class TeleprompterHelper {
  private deps: ITeleprompterHelperDeps
  private isGeneratingResponse: boolean = false
  
  constructor(deps: ITeleprompterHelperDeps) {
    this.deps = deps
  }

  /**
   * Gets the currently selected teleprompter model from the main window or falls back to main model
   * @returns The current model ID
   */
  private async getCurrentModel(): Promise<string> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) {
      // Fall back to store if no window is available
      return this.deps.store.get('model')
    }

    try {
      // Get the teleprompter model from the window global variable
      const teleprompterModel = await mainWindow.webContents.executeJavaScript('window.__TELEPROMPTER_MODEL__')
      
      if (typeof teleprompterModel === 'string' && teleprompterModel) {
        return teleprompterModel
      } 
      
      // If no teleprompter model is set, fall back to the main model
      const mainModel = await mainWindow.webContents.executeJavaScript('window.__MODEL__')
      if (typeof mainModel === 'string' && mainModel) {
        return mainModel
      }
      
      // Fall back to store if window globals aren't set
      return this.deps.store.get('model')
    } catch (error) {
      console.error('Error getting teleprompter model:', error)
      // Fall back to store if there's an error
      return this.deps.store.get('model')
    }
  }

  /**
   * Generate an AI response to an interview question
   * @param transcript The transcribed interview question
   * @returns Object with success flag and either response data or error message
   */
  public async generateResponse(transcript: string): Promise<{ 
    success: boolean; 
    data?: string; 
    error?: string 
  }> {
    if (this.isGeneratingResponse) {
      return { 
        success: false, 
        error: "Already generating a response, please wait" 
      }
    }

    if (!transcript || transcript.trim().length < 10) {
      return { 
        success: false, 
        error: "Transcript is too short to generate a meaningful response" 
      }
    }

    try {
      this.isGeneratingResponse = true
      
      // Get main window
      const mainWindow = this.deps.getMainWindow()
      if (!mainWindow) {
        throw new Error("No main window available")
      }
      
      // Get the current model from window.__TELEPROMPTER_MODEL__ or fallbacks
      const currentModel = await this.getCurrentModel()
      
      // Check if we're using the teleprompter model or a fallback
      try {
        const teleprompterModel = await mainWindow.webContents.executeJavaScript('window.__TELEPROMPTER_MODEL__')
        const mainModel = await mainWindow.webContents.executeJavaScript('window.__MODEL__')
        
        if (currentModel === teleprompterModel) {
          console.log("Using dedicated teleprompter model:", currentModel)
        } else if (currentModel === mainModel) {
          console.log("Using main model as fallback for teleprompter:", currentModel)
        } else {
          console.log("Using store model as fallback for teleprompter:", currentModel)
        }
      } catch (error) {
        console.log("Using model for teleprompter response:", currentModel)
      }
      
      // Create prompt
      const messages = createTeleprompterMessages(transcript)
      
      // Generate completion
      const response = await this.deps.aiManager.generateCompletion(
        currentModel, 
        messages, 
        {}
      )
      
      if (!response || !response.content) {
        throw new Error("Failed to generate response")
      }
      
      return {
        success: true,
        data: response.content
      }
    } catch (error: any) {
      console.error("Error generating teleprompter response:", error)
      return {
        success: false,
        error: error.message || "Failed to generate response"
      }
    } finally {
      this.isGeneratingResponse = false
    }
  }
} 