import { globalShortcut, app } from "electron"
import { IShortcutsHelperDeps } from "./main"

export class ShortcutsHelper {
  private deps: IShortcutsHelperDeps

  constructor(deps: IShortcutsHelperDeps) {
    this.deps = deps
  }

  public registerGlobalShortcuts(): void {
    // Get the current hotkey configuration
    const hotkeys = this.deps.getHotkeys();

    // Screenshot shortcut
    globalShortcut.register(hotkeys.screenshot, async () => {
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        console.log("Taking screenshot...")
        try {
          const screenshotPath = await this.deps.takeScreenshot()
          const preview = await this.deps.getImagePreview(screenshotPath)
          mainWindow.webContents.send("screenshot-taken", {
            path: screenshotPath,
            preview
          })
        } catch (error) {
          console.error("Error capturing screenshot:", error)
        }
      }
    })

    // Register manual recording toggle for teleprompter
    globalShortcut.register("CommandOrControl+X", () => {
      console.log("Command/Ctrl + X pressed. Toggling manual recording in teleprompter.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-manual-recording")
      }
    })

    // Solve shortcut
    globalShortcut.register(hotkeys.solve, async () => {
      await this.deps.processingHelper?.processScreenshots()
    })

    // Reset shortcut
    globalShortcut.register(hotkeys.reset, () => {
      console.log("Reset shortcut pressed. Canceling requests and resetting queues...")

      // Cancel ongoing API requests
      this.deps.processingHelper?.cancelOngoingRequests()

      // Clear both screenshot queues
      this.deps.clearQueues()

      console.log("Cleared queues.")

      // Update the view state to 'queue'
      this.deps.setView("queue")

      // Notify renderer process to switch view to 'queue'
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("reset-view")
        mainWindow.webContents.send("reset")
      }
    })

    // Window movement shortcuts
    globalShortcut.register(hotkeys.left, () => {
      console.log("Move window left shortcut pressed.")
      this.deps.moveWindowLeft()
    })

    globalShortcut.register(hotkeys.right, () => {
      console.log("Move window right shortcut pressed.")
      this.deps.moveWindowRight()
    })

    globalShortcut.register(hotkeys.down, () => {
      console.log("Move window down shortcut pressed.")
      this.deps.moveWindowDown()
    })

    globalShortcut.register(hotkeys.up, () => {
      console.log("Move window up shortcut pressed.")
      this.deps.moveWindowUp()
    })

    // Toggle window visibility
    globalShortcut.register(hotkeys.hideApp, () => {
      console.log("Toggle window visibility shortcut pressed.")
      this.deps.toggleMainWindow()
    })

    // Toggle teleprompter panel
    globalShortcut.register(hotkeys.teleprompter, () => {
      console.log("Toggle teleprompter panel shortcut pressed.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-stt-panel")
      }
    })

    // Toggle chat panel
    globalShortcut.register(hotkeys.chat, () => {
      console.log("Toggle chat panel shortcut pressed.")
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-chat")
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
