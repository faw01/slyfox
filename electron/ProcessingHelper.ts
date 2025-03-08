// ProcessingHelper.ts
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import axios from "axios"
import { app } from "electron"
import { BrowserWindow } from "electron"
import { createAIManager } from "../src/lib/models"
import { store } from "./store"

// Import centralized configuration
import { createProblemExtractionMessages } from "../src/lib/config/prompts/extract"
import { createSolutionGenerationMessages } from "../src/lib/config/prompts/solve"
import { createDebugMessages } from "../src/lib/config/prompts/debug"
import { getConfigForTask } from "../src/lib/config"

const isDev = !app.isPackaged

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper
  private aiManager: ReturnType<typeof createAIManager>

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
    this.aiManager = createAIManager(store)
  }

  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(`
        if (typeof window.__LANGUAGE__ === 'undefined') {
          window.__LANGUAGE__ = 'python';
        }
        window.__IS_INITIALIZED__ = true;
        true;
      `)
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getLanguage(): Promise<string> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return "python"

    try {
      await this.waitForInitialization(mainWindow)
      const language = await mainWindow.webContents.executeJavaScript(
        "window.__LANGUAGE__"
      )

      if (
        typeof language !== "string" ||
        language === undefined ||
        language === null
      ) {
        console.warn("Language not properly initialized")
        return "python"
      }

      return language
    } catch (error) {
      console.error("Error getting language:", error)
      return "python"
    }
  }

  private async getModel(): Promise<string> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return "gpt-4o" // Default to GPT-4o

    try {
      await this.waitForInitialization(mainWindow)
      const model = await mainWindow.webContents.executeJavaScript(
        "window.__MODEL__"
      )

      if (
        typeof model !== "string" ||
        model === undefined ||
        model === null
      ) {
        console.warn("Model not properly initialized")
        return "gpt-4o"
      }

      return model
    } catch (error) {
      console.error("Error getting model:", error)
      return "gpt-4o"
    }
  }

  private async getVisionModel(): Promise<string> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return "gpt-4o-mini" // Default to GPT-4o mini

    try {
      await this.waitForInitialization(mainWindow)
      const model = await mainWindow.webContents.executeJavaScript(
        "window.__VISION_MODEL__"
      )

      if (
        typeof model !== "string" ||
        model === undefined ||
        model === null
      ) {
        console.warn("Vision model not properly initialized")
        return "gpt-4o-mini"
      }

      return model
    } catch (error) {
      console.error("Error getting vision model:", error)
      return "gpt-4o-mini"
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const view = this.deps.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      if (screenshotQueue.length === 0) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }

      try {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)

        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()
        const { signal } = this.currentProcessingAbortController

        const screenshots = await Promise.all(
          screenshotQueue.map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )

        const result = await this.processScreenshotsHelper(screenshots, signal)

        if (!result.success) {
          console.log("Processing failed:", result.error)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            result.error
          )
          // Reset view back to queue on error
          console.log("Resetting view to queue due to error")
          this.deps.setView("queue")
          return
        }

        // Only set view to solutions if processing succeeded
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
          result.data
        )
        this.deps.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "Server error. Please try again."
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      if (extraScreenshotQueue.length === 0) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
        return
      }
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()
      const { signal } = this.currentExtraProcessingAbortController

      try {
        const screenshots = await Promise.all(
          [
            ...this.screenshotHelper.getScreenshotQueue(),
            ...extraScreenshotQueue
          ].map(async (path) => ({
            path,
            preview: await this.screenshotHelper.getImagePreview(path),
            data: fs.readFileSync(path).toString("base64")
          }))
        )
        console.log(
          "Combined screenshots for processing:",
          screenshots.map((s) => s.path)
        )

        const result = await this.processExtraScreenshotsHelper(
          screenshots,
          signal
        )

        if (result.success) {
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS,
            result.data
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            result.error
          )
        }
      } catch (error: any) {
        if (axios.isCancel(error)) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  private sanitizeAndParseJSON(content: string) {
    try {
      console.log("Raw content (full response):", content)
      const parsed = JSON.parse(content)
      console.log("Parsed content:", JSON.stringify(parsed, null, 2))
      return parsed
    } catch (error) {
      console.error("JSON parsing error:", error)
      throw error
    }
  }

  private async processScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    const MAX_RETRIES = 0
    let retryCount = 0

    while (retryCount <= MAX_RETRIES) {
      try {
        const imageDataList = screenshots.map((screenshot) => screenshot.data)
        const mainWindow = this.deps.getMainWindow()
        const language = await this.getLanguage()
        const visionModel = await this.getVisionModel()
        let problemInfo

        // First API call - extract problem info
        try {
          // Use centralized prompt configuration instead of hardcoded messages
          const messages = createProblemExtractionMessages(imageDataList)

          const extractResponse = await this.aiManager.generateCompletion(
            visionModel,
            messages,
            { signal }
          )

          problemInfo = this.sanitizeAndParseJSON(extractResponse.content)

          // Store problem info in AppState
          this.deps.setProblemInfo(problemInfo)

          // Send first success event
          if (mainWindow) {
            mainWindow.webContents.send(
              this.deps.PROCESSING_EVENTS.PROBLEM_EXTRACTED,
              problemInfo
            )

            // Generate solutions after successful extraction
            const solutionsResult = await this.generateSolutionsHelper(signal)
            if (solutionsResult.success) {
              // Clear any existing extra screenshots before transitioning to solutions view
              this.screenshotHelper.clearExtraScreenshotQueue()
              mainWindow.webContents.send(
                this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS,
                solutionsResult.data
              )
              return { success: true, data: solutionsResult.data }
            } else {
              throw new Error(
                solutionsResult.error || "Failed to generate solutions"
              )
            }
          }
        } catch (error: any) {
          // If the request was cancelled, don't retry
          if (axios.isCancel(error)) {
            return {
              success: false,
              error: "Processing was canceled by the user."
            }
          }

          console.error("API Error Details:", error)

          // If we get here, it's an unknown error
          throw new Error(error.message || "Server error. Please try again.")
        }
      } catch (error: any) {
        // Log the full error for debugging
        console.error("Processing error details:", error)

        // If it's a cancellation or we've exhausted retries, return the error
        if (axios.isCancel(error) || retryCount >= MAX_RETRIES) {
          return { success: false, error: error.message }
        }

        // Increment retry count and continue
        retryCount++
      }
    }

    // If we get here, all retries failed
    return {
      success: false,
      error: "Failed to process after multiple attempts. Please try again."
    }
  }

  private async generateSolutionsHelper(signal: AbortSignal) {
    try {
      const problemInfo = this.deps.getProblemInfo()
      const language = await this.getLanguage()
      const model = await this.getModel()

      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use centralized prompt configuration and pass the language
      const messages = createSolutionGenerationMessages(problemInfo, language)

      const response = await this.aiManager.generateCompletion(
        model,
        messages,
        { signal }
      )

      const result = this.sanitizeAndParseJSON(response.content)
      return { success: true, data: result }
    } catch (error: any) {
      const mainWindow = this.deps.getMainWindow()

      // Handle timeout errors
      if (error.code === "ECONNABORTED" || error.response?.status === 504) {
        // Cancel ongoing API requests
        this.cancelOngoingRequests()
        // Clear both screenshot queues
        this.deps.clearQueues()

        // Notify renderer to switch view
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("reset-view")
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Request timed out. The server took too long to respond. Please try again."
          )
        }
        return {
          success: false,
          error: "Request timed out. Please try again."
        }
      }

      return {
        success: false,
        error: error.message || "An unknown error occurred"
      }
    }
  }

  private async processExtraScreenshotsHelper(
    screenshots: Array<{ path: string; data: string }>,
    signal: AbortSignal
  ) {
    try {
      const imageDataList = screenshots.map((screenshot) => screenshot.data)
      const problemInfo = this.deps.getProblemInfo()
      const language = await this.getLanguage()
      const visionModel = await this.getVisionModel()

      if (!problemInfo) {
        throw new Error("No problem info available")
      }

      // Use centralized prompt configuration instead of hardcoded messages
      const messages = createDebugMessages(problemInfo, imageDataList)

      const response = await this.aiManager.generateCompletion(
        visionModel,
        messages,
        { signal }
      )

      const result = this.sanitizeAndParseJSON(response.content)
      return { success: true, data: result }
    } catch (error: any) {
      console.error("Debug processing error:", error)
      return {
        success: false,
        error: error.message || "An unknown error occurred during debugging"
      }
    }
  }

  public cancelOngoingRequests(): void {
    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
    }
    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
    }
  }
}
