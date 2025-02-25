// ipcHandlers.ts

import { ipcMain, shell, app } from "electron"
import { randomBytes } from "crypto"
import { store } from "./store"
import { IIpcHandlerDeps } from "./main"

export function initializeIpcHandlers(deps: IIpcHandlerDeps): void {
  console.log("Initializing IPC handlers")

  // Create Supabase client when needed
  const createSupabaseClient = () => {
    return createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    )
  }

  // Credits handlers
  ipcMain.handle("set-initial-credits", async (_event, credits: number) => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      // Set the credits in a way that ensures atomicity
      await mainWindow.webContents.executeJavaScript(
        `window.__CREDITS__ = ${credits}`
      )
      mainWindow.webContents.send("credits-updated", credits)
    } catch (error) {
      console.error("Error setting initial credits:", error)
      throw error
    }
  })

  ipcMain.handle("decrement-credits", async () => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      const currentCredits = await mainWindow.webContents.executeJavaScript(
        "window.__CREDITS__"
      )
      if (currentCredits > 0) {
        const newCredits = currentCredits - 1
        await mainWindow.webContents.executeJavaScript(
          `window.__CREDITS__ = ${newCredits}`
        )
        mainWindow.webContents.send("credits-updated", newCredits)
      }
    } catch (error) {
      console.error("Error decrementing credits:", error)
    }
  })

  // Screenshot queue handlers
  ipcMain.handle("get-screenshot-queue", () => {
    return deps.getScreenshotQueue()
  })

  ipcMain.handle("get-extra-screenshot-queue", () => {
    return deps.getExtraScreenshotQueue()
  })

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return deps.deleteScreenshot(path)
  })

  ipcMain.handle("get-image-preview", async (event, path: string) => {
    return deps.getImagePreview(path)
  })

  // Screenshot processing handlers
  ipcMain.handle("process-screenshots", async () => {
    await deps.processingHelper?.processScreenshots()
  })

  // Window dimension handlers
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        deps.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle(
    "set-window-dimensions",
    (event, width: number, height: number) => {
      deps.setWindowDimensions(width, height)
    }
  )

  // Screenshot management handlers
  ipcMain.handle("get-screenshots", async () => {
    try {
      let previews = []
      const currentView = deps.getView()

      if (currentView === "queue") {
        const queue = deps.getScreenshotQueue()
        previews = await Promise.all(
          queue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      } else {
        const extraQueue = deps.getExtraScreenshotQueue()
        previews = await Promise.all(
          extraQueue.map(async (path) => ({
            path,
            preview: await deps.getImagePreview(path)
          }))
        )
      }

      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      throw error
    }
  })

  // Screenshot trigger handlers
  ipcMain.handle("trigger-screenshot", async () => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        const screenshotPath = await deps.takeScreenshot()
        const preview = await deps.getImagePreview(screenshotPath)
        mainWindow.webContents.send("screenshot-taken", {
          path: screenshotPath,
          preview
        })
        return { success: true }
      } catch (error) {
        console.error("Error triggering screenshot:", error)
        return { error: "Failed to trigger screenshot" }
      }
    }
    return { error: "No main window available" }
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await deps.takeScreenshot()
      const preview = await deps.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      return { error: "Failed to take screenshot" }
    }
  })

  // Auth related handlers
  ipcMain.handle("get-pkce-verifier", () => {
    return randomBytes(32).toString("base64url")
  })

  ipcMain.handle("open-external-url", (event, url: string) => {
    shell.openExternal(url)
  })

  // Subscription handlers
  ipcMain.handle("open-settings-portal", () => {
    shell.openExternal("https://www.interviewcoder.co/settings")
  })
  ipcMain.handle("open-subscription-portal", async (_event, authData) => {
    try {
      const url = "https://www.interviewcoder.co/checkout"
      await shell.openExternal(url)
      return { success: true }
    } catch (error) {
      console.error("Error opening checkout page:", error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to open checkout page"
      }
    }
  })

  // Window management handlers
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      console.error("Error toggling window:", error)
      return { error: "Failed to toggle window" }
    }
  })

  ipcMain.handle("reset-queues", async () => {
    try {
      deps.clearQueues()
      return { success: true }
    } catch (error) {
      console.error("Error resetting queues:", error)
      return { error: "Failed to reset queues" }
    }
  })

  // Process screenshot handlers
  ipcMain.handle("trigger-process-screenshots", async () => {
    try {
      await deps.processingHelper?.processScreenshots()
      return { success: true }
    } catch (error) {
      console.error("Error processing screenshots:", error)
      return { error: "Failed to process screenshots" }
    }
  })

  // Reset handlers
  ipcMain.handle("trigger-reset", () => {
    try {
      // First cancel any ongoing requests
      deps.processingHelper?.cancelOngoingRequests()

      // Clear all queues immediately
      deps.clearQueues()

      // Reset view to queue
      deps.setView("queue")

      // Get main window and send reset events
      const mainWindow = deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Send reset events in sequence
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }

      return { success: true }
    } catch (error) {
      console.error("Error triggering reset:", error)
      return { error: "Failed to trigger reset" }
    }
  })

  // Window movement handlers
  ipcMain.handle("trigger-move-left", () => {
    try {
      deps.moveWindowLeft()
      return { success: true }
    } catch (error) {
      console.error("Error moving window left:", error)
      return { error: "Failed to move window left" }
    }
  })

  ipcMain.handle("trigger-move-right", () => {
    try {
      deps.moveWindowRight()
      return { success: true }
    } catch (error) {
      console.error("Error moving window right:", error)
      return { error: "Failed to move window right" }
    }
  })

  ipcMain.handle("trigger-move-up", () => {
    try {
      deps.moveWindowUp()
      return { success: true }
    } catch (error) {
      console.error("Error moving window up:", error)
      return { error: "Failed to move window up" }
    }
  })

  ipcMain.handle("trigger-move-down", () => {
    try {
      deps.moveWindowDown()
      return { success: true }
    } catch (error) {
      console.error("Error moving window down:", error)
      return { error: "Failed to move window down" }
    }
  })

  // Model handler
  ipcMain.handle("set-model", async (_event, model: string) => {
    const mainWindow = deps.getMainWindow()
    if (!mainWindow) return

    try {
      store.set("model", model)
      await mainWindow.webContents.executeJavaScript(
        `window.__MODEL__ = "${model}"`
      )
      return { success: true }
    } catch (error) {
      console.error("Error setting model:", error)
      return { error: "Failed to set model" }
    }
  })

  // Theme handlers
  ipcMain.handle('get-theme', () => {
    return store.get('theme')
  })

  ipcMain.handle('set-theme', (_event, theme: 'light' | 'dark') => {
    store.set('theme', theme)
  })

  // Opacity handlers
  ipcMain.handle('get-opacity', () => {
    return store.get('opacity')
  })

  ipcMain.handle('set-opacity', (_event, opacity: number) => {
    store.set('opacity', opacity)
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      mainWindow.setOpacity(opacity)
    }
  })

  // API Key handlers
  ipcMain.handle('get-api-keys', () => {
    return store.get('apiKeys')
  })

  type ApiProvider = 'openai' | 'anthropic' | 'google' | 'deepseek'

  ipcMain.handle('set-api-key', (_event, { provider, key }: { provider: ApiProvider; key: string }) => {
    const apiKeys = store.get('apiKeys')
    store.set('apiKeys', { ...apiKeys, [provider]: key })
  })

  ipcMain.handle('clear-api-key', (_event, provider: ApiProvider) => {
    const apiKeys = store.get('apiKeys')
    const newApiKeys = { ...apiKeys }
    delete newApiKeys[provider]
    store.set('apiKeys', newApiKeys)
  })

  // Add this near the other handlers
  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
  })

  // Add handler for Electron version
  ipcMain.handle('get-electron-version', () => {
    return process.versions.electron
  })

  // Add this near the other handlers
  ipcMain.handle('get-content-protection', () => {
    return store.get('contentProtection') ?? true
  })

  ipcMain.handle('set-content-protection', (_event, enabled: boolean) => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow) {
      try {
        // Store the setting
        store.set('contentProtection', enabled)
        
        // Apply all screen capture resistance settings
        mainWindow.setContentProtection(enabled)
        mainWindow.setHiddenInMissionControl(enabled)
        mainWindow.setVisibleOnAllWorkspaces(enabled, {
          visibleOnFullScreen: enabled
        })
        mainWindow.setAlwaysOnTop(enabled, "floating", 1)
        
        // Apply these settings for all platforms
        mainWindow.setSkipTaskbar(enabled)
        mainWindow.setHasShadow(!enabled)
        
        // macOS specific settings
        if (process.platform === "darwin") {
          mainWindow.setWindowButtonVisibility(!enabled)
        }
        
        mainWindow.webContents.setBackgroundThrottling(!enabled)
        mainWindow.webContents.setFrameRate(enabled ? 60 : 30)
        
        return { success: true }
      } catch (error) {
        console.error('Error setting content protection:', error)
        return { error: 'Failed to set content protection' }
      }
    }
    return { error: 'No main window available' }
  })
}
