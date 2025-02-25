// ProcessingHelper.ts
import fs from "node:fs"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import axios from "axios"
import { app } from "electron"
import { BrowserWindow } from "electron"
import { createAIManager } from "../src/lib/models"
import { store } from "./store"

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
          const messages = [
            {
              role: "developer",
              content: `You are a coding assistant that extracts Leetcode problem information from screenshots into structured data. 
                       Extract key details and return them in JSON format with the following structure:
                       {
                         "title": "The title of the problem",
                         "problem_statement": "Clear problem statement combining title and description",
                         "input_format": "Input format with parameters",
                         "output_format": "Output format with type information",
                         "complexity": {
                           "time": "Time complexity requirements",
                           "space": "Space complexity requirements"
                         },
                         "examples": "Example test cases",
                         "validation": "Validation approach",
                         "difficulty": "Difficulty level"
                       }`
            },
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: "Extract the coding problem details and return them as a JSON object." 
                },
                ...imageDataList.map(data => ({
                  type: "image_url",
                  image_url: {
                    url: `data:image/png;base64,${data}`
                  }
                }))
              ]
            }
          ]

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

      const messages = [
        {
          role: "developer",
          content: `You are a coding assistant that generates optimized code solutions with detailed explanations for Leetcode problems.
                   For the given problem, analyze the requirements and return a JSON response with:
                   {
                     "thoughts": ["Your step-by-step thought process using the UMPIRE method (Understand: test cases & edge cases)", 
                                "Match: identify problem pattern from a possible set of Leetcode patterns",
                                "Plan: visualization & approach",
                                "Implement: single function solution",
                                "Review: step through code",
                                "Evaluate: complexity & tradeoffs"],
                     "leetcode_match": {
                       "problem_number": "Number of the most similar Leetcode problem",
                       "title": "Title of the most similar Leetcode problem",
                       "difficulty": "Difficulty of the matched problem",
                       "pattern": "One of: Sliding Window, Two Pointers, Fast & Slow Pointers, Merge Intervals, Cyclic Sort, In-place Reversal of LinkedList, Tree BFS, Tree DFS, Two Heaps, Subsets, Modified Binary Search, Top K Elements, K-way Merge, Topological Sort, 0/1 Knapsack"
                     },
                     "approach": "Detailed solution approach following UMPIRE strategy, focusing on the core algorithm without any helper functions",
                     "code": "Implementation in a single function without helper functions. IMPORTANT: Write sequential comments explaining your thought process, reasoning, and any doubts/considerations. Example as follows:

                     Let me walk you through my implementation process:

                     First, I'll set up the basic structure we need.
                     # Define our main function with the required parameters
                     # This signature matches the problem requirements exactly
                     def solution(nums: List[int], k: int) -> int:
                         pass

                     I'm considering using a sliding window approach, though I briefly thought about using sorting.
                     # Initialize sliding window variables for tracking our current window
                     # Sliding window is more efficient than sorting (O(n) vs O(nlogn))
                     window_sum = 0
                     max_sum = float('-inf')

                     Now, I'm thinking we need to handle edge cases. What if k > len(nums)?
                     # Add input validation to handle edge cases
                     # This prevents runtime errors and makes our solution more robust
                     if k > len(nums):
                         return 0

                     Here's where it gets interesting - we could use a deque for O(1) operations.
                     # Create a deque for efficient window management
                     # While a regular array would work, deque gives us O(1) for both ends
                     # This is a trade-off: slightly more memory for better time complexity
                     window = collections.deque()

                     Make sure each section includes:
                     1. What you're about to implement and why
                     2. Any alternative approaches you considered
                     3. Trade-offs and reasoning behind your decisions
                     4. Clear explanation of how each part contributes to the solution",
                     "complexity": {
                       "time": "Time complexity analysis with detailed explanation",
                       "space": "Space complexity analysis with detailed explanation"
                     },
                     "explanation": "Step by step explanation of how the code works"
                   }`
        },
        {
          role: "user",
          content: `Generate a solution for this coding problem and return it as a JSON object. Problem: ${JSON.stringify(problemInfo)}.`
        }
      ]

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

      const messages = [
        {
          role: "developer",
          content: `You are a coding assistant that debugs code and provides improved solutions with explanations.
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
                   Important: Focus on modifying the existing solution rather than creating a new one from scratch.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Debug and enhance this code to handle follow-up requirements while maintaining the core solution structure. Problem: ${JSON.stringify(problemInfo)}.` 
            },
            ...imageDataList.map(data => ({
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${data}`
              }
            }))
          ]
        }
      ]

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
