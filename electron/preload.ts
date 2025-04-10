console.log("Preload script starting...")
import { contextBridge, ipcRenderer, DesktopCapturerSource } from "electron"
const { shell } = require("electron")

// Types for the exposed Electron API
interface ElectronAPI {
  openSubscriptionPortal: (authData: {
    id: string
    email: string
  }) => Promise<{ success: boolean; error?: string }>
  updateContentDimensions: (dimensions: {
    width: number
    height: number
  }) => Promise<void>
  clearStore: () => Promise<{ success: boolean; error?: string }>
  getScreenshots: () => Promise<{
    success: boolean
    previews?: Array<{ path: string; preview: string }> | null
    error?: string
  }>
  deleteScreenshot: (
    path: string
  ) => Promise<{ success: boolean; error?: string }>
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => () => void
  onResetView: (callback: () => void) => () => void
  onSolutionStart: (callback: () => void) => () => void
  onDebugStart: (callback: () => void) => () => void
  onDebugSuccess: (callback: (data: any) => void) => () => void
  onSolutionError: (callback: (error: string) => void) => () => void
  onProcessingNoScreenshots: (callback: () => void) => () => void
  onProblemExtracted: (callback: (data: any) => void) => () => void
  onSolutionSuccess: (callback: (data: any) => void) => () => void
  onUnauthorized: (callback: () => void) => () => void
  onDebugError: (callback: (error: string) => void) => () => void
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  toggleSTTPanel: () => Promise<{ success: boolean; error?: string }>
  toggleChat: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
  setProblemInfo: (problemInfo: any) => Promise<void>
  triggerMoveLeft: () => Promise<{ success: boolean; error?: string }>
  triggerMoveRight: () => Promise<{ success: boolean; error?: string }>
  triggerMoveUp: () => Promise<{ success: boolean; error?: string }>
  triggerMoveDown: () => Promise<{ success: boolean; error?: string }>
  onSubscriptionUpdated: (callback: () => void) => () => void
  onSubscriptionPortalClosed: (callback: () => void) => () => void
  startUpdate: () => Promise<{ success: boolean; error?: string }>
  installUpdate: () => void
  onUpdateAvailable: (callback: (info: any) => void) => () => void
  onUpdateDownloaded: (callback: (info: any) => void) => () => void
  decrementCredits: () => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  setModel: (model: string) => Promise<void>
  getTheme: () => Promise<string>
  setTheme: (theme: 'light' | 'dark') => Promise<void>
  getApiKeys: () => Promise<Array<{ provider: string; key: string }>>
  setApiKey: (provider: string, key: string) => Promise<void>
  clearApiKey: (provider: string) => Promise<void>
  getOpacity: () => Promise<number>
  setOpacity: (opacity: number) => Promise<void>
  getAppVersion: () => Promise<string>
  getElectronVersion: () => Promise<string>
  getContentProtection: () => Promise<boolean>
  setContentProtection: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  getTaskbarIcon: () => Promise<boolean>
  setTaskbarIcon: (hidden: boolean) => Promise<{ success: boolean; error?: string }>
  getPlatform: () => string
  getSystemAudioSources: () => Promise<Array<{
    id: string
    name: string
    thumbnailURL?: string
    type: 'screen' | 'window' | 'audio' | 'unknown'
  }>>
  getApplicationSources: () => Promise<{
    id: string;
    name: string;
    thumbnailURL: string;
    appIcon?: string;
  }[]>;
  getScreenSources: () => Promise<{
    id: string;
    name: string;
    thumbnailURL: string;
    type: 'screen';
  }[]>;
  saveTempAudio: (audioBlob: Blob) => Promise<string>
  runWhisperCLI: (filePath: string, modelName: string) => Promise<string>
  cleanupTempFile: (filePath: string) => Promise<void>
  generateTeleprompterResponse: (transcript: string) => Promise<{ success: boolean; data?: string; error?: string }>
  onToggleSTTPanel: (callback: () => void) => () => void
  onToggleChat: (callback: () => void) => () => void
  onToggleManualRecording: (callback: () => void) => () => void
  generateChatResponse: (options: { 
    model: string; 
    message: string;
    history?: Array<{role: string; content: string}>
    useSearch?: boolean;
  }) => Promise<{ 
    success: boolean; 
    data?: string; 
    error?: string;
    sources?: Array<{title?: string; url: string}>;
  }>
  getHotkeys: () => Promise<Array<{ key: string; value: string }>>
  setHotkey: (data: { key: string; value: string }) => Promise<void>
  onHotkeysChanged: (callback: () => void) => () => void
}

export const PROCESSING_EVENTS = {
  //global states
  UNAUTHORIZED: "procesing-unauthorized",
  NO_SCREENSHOTS: "processing-no-screenshots",
  OUT_OF_CREDITS: "out-of-credits",

  //states for generating the initial solution
  INITIAL_START: "initial-start",
  PROBLEM_EXTRACTED: "problem-extracted",
  SOLUTION_SUCCESS: "solution-success",
  INITIAL_SOLUTION_ERROR: "solution-error",
  RESET: "reset",

  //states for processing the debugging
  DEBUG_START: "debug-start",
  DEBUG_SUCCESS: "debug-success",
  DEBUG_ERROR: "debug-error"
} as const

// At the top of the file
console.log("Preload script is running")

const electronAPI = {
  openSubscriptionPortal: async (authData: { id: string; email: string }) => {
    return ipcRenderer.invoke("open-subscription-portal", authData)
  },
  openSettingsPortal: () => ipcRenderer.invoke("open-settings-portal"),
  updateContentDimensions: (dimensions: { width: number; height: number }) =>
    ipcRenderer.invoke("update-content-dimensions", dimensions),
  clearStore: () => ipcRenderer.invoke("clear-store"),
  getScreenshots: () => ipcRenderer.invoke("get-screenshots"),
  deleteScreenshot: (path: string) =>
    ipcRenderer.invoke("delete-screenshot", path),
  toggleMainWindow: async () => {
    console.log("toggleMainWindow called from preload")
    try {
      const result = await ipcRenderer.invoke("toggle-window")
      console.log("toggle-window result:", result)
      return result
    } catch (error) {
      console.error("Error in toggleMainWindow:", error)
      return { success: false, error: String(error) }
    }
  },
  toggleSTTPanel: async () => {
    console.log("toggleSTTPanel called from preload")
    try {
      const result = await ipcRenderer.invoke("toggle-stt-panel")
      console.log("toggle-stt-panel result:", result)
      return result
    } catch (error) {
      console.error("Error in toggleSTTPanel:", error)
      return { success: false, error: String(error) }
    }
  },
  toggleChat: async () => {
    console.log("toggleChat called from preload")
    try {
      const result = await ipcRenderer.invoke("toggle-chat")
      console.log("toggle-chat result:", result)
      return result
    } catch (error) {
      console.error("Error in toggleChat:", error)
      return { success: false, error: String(error) }
    }
  },
  // Event listeners
  onScreenshotTaken: (
    callback: (data: { path: string; preview: string }) => void
  ) => {
    const subscription = (_: any, data: { path: string; preview: string }) =>
      callback(data)
    ipcRenderer.on("screenshot-taken", subscription)
    return () => {
      ipcRenderer.removeListener("screenshot-taken", subscription)
    }
  },
  onResetView: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("reset-view", subscription)
    return () => {
      ipcRenderer.removeListener("reset-view", subscription)
    }
  },
  onSolutionStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.INITIAL_START, subscription)
    }
  },
  onDebugStart: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_START, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_START, subscription)
    }
  },
  onDebugSuccess: (callback: (data: any) => void) => {
    ipcRenderer.on("debug-success", (_event, data) => callback(data))
    return () => {
      ipcRenderer.removeListener("debug-success", (_event, data) =>
        callback(data)
      )
    }
  },
  onDebugError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.DEBUG_ERROR, subscription)
    }
  },
  onSolutionError: (callback: (error: string) => void) => {
    const subscription = (_: any, error: string) => callback(error)
    ipcRenderer.on(PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
        subscription
      )
    }
  },
  onProcessingNoScreenshots: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.NO_SCREENSHOTS, subscription)
    }
  },
  onOutOfCredits: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.OUT_OF_CREDITS, subscription)
    }
  },
  onProblemExtracted: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.PROBLEM_EXTRACTED, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.PROBLEM_EXTRACTED,
        subscription
      )
    }
  },
  onSolutionSuccess: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data)
    ipcRenderer.on(PROCESSING_EVENTS.SOLUTION_SUCCESS, subscription)
    return () => {
      ipcRenderer.removeListener(
        PROCESSING_EVENTS.SOLUTION_SUCCESS,
        subscription
      )
    }
  },
  onUnauthorized: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.UNAUTHORIZED, subscription)
    }
  },
  onToggleSTTPanel: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("toggle-stt-panel", subscription)
    return () => {
      ipcRenderer.removeListener("toggle-stt-panel", subscription)
    }
  },
  onToggleManualRecording: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("toggle-manual-recording", subscription)
    return () => {
      ipcRenderer.removeListener("toggle-manual-recording", subscription)
    }
  },
  onToggleChat: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("toggle-chat", subscription)
    return () => {
      ipcRenderer.removeListener("toggle-chat", subscription)
    }
  },
  openExternal: (url: string) => shell.openExternal(url),
  triggerScreenshot: () => ipcRenderer.invoke("trigger-screenshot"),
  triggerProcessScreenshots: () =>
    ipcRenderer.invoke("trigger-process-screenshots"),
  triggerReset: () => ipcRenderer.invoke("trigger-reset"),
  setProblemInfo: (problemInfo: any) => 
    ipcRenderer.invoke("set-problem-info", problemInfo),
  triggerMoveLeft: () => ipcRenderer.invoke("trigger-move-left"),
  triggerMoveRight: () => ipcRenderer.invoke("trigger-move-right"),
  triggerMoveUp: () => ipcRenderer.invoke("trigger-move-up"),
  triggerMoveDown: () => ipcRenderer.invoke("trigger-move-down"),
  onSubscriptionUpdated: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("subscription-updated", subscription)
    return () => {
      ipcRenderer.removeListener("subscription-updated", subscription)
    }
  },
  onSubscriptionPortalClosed: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("subscription-portal-closed", subscription)
    return () => {
      ipcRenderer.removeListener("subscription-portal-closed", subscription)
    }
  },
  onReset: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on(PROCESSING_EVENTS.RESET, subscription)
    return () => {
      ipcRenderer.removeListener(PROCESSING_EVENTS.RESET, subscription)
    }
  },
  startUpdate: () => ipcRenderer.invoke("start-update"),
  installUpdate: () => ipcRenderer.invoke("install-update"),
  onUpdateAvailable: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-available", subscription)
    return () => {
      ipcRenderer.removeListener("update-available", subscription)
    }
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const subscription = (_: any, info: any) => callback(info)
    ipcRenderer.on("update-downloaded", subscription)
    return () => {
      ipcRenderer.removeListener("update-downloaded", subscription)
    }
  },
  decrementCredits: () => ipcRenderer.invoke("decrement-credits"),
  onCreditsUpdated: (callback: (credits: number) => void) => {
    const subscription = (_event: any, credits: number) => callback(credits)
    ipcRenderer.on("credits-updated", subscription)
    return () => {
      ipcRenderer.removeListener("credits-updated", subscription)
    }
  },
  setModel: (model: string) => ipcRenderer.invoke("set-model", model),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: 'light' | 'dark') => ipcRenderer.invoke('set-theme', theme),
  getOpacity: () => ipcRenderer.invoke('get-opacity'),
  setOpacity: (opacity: number) => ipcRenderer.invoke('set-opacity', opacity),
  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
  setApiKey: (provider: string, key: string) => 
    ipcRenderer.invoke('set-api-key', { provider, key }),
  clearApiKey: (provider: string) => 
    ipcRenderer.invoke('clear-api-key', provider),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getElectronVersion: () => ipcRenderer.invoke('get-electron-version'),
  getContentProtection: () => ipcRenderer.invoke('get-content-protection'),
  setContentProtection: (enabled: boolean) => 
    ipcRenderer.invoke('set-content-protection', enabled),
  getTaskbarIcon: () => ipcRenderer.invoke('get-taskbar-icon'),
  setTaskbarIcon: (hidden: boolean) => 
    ipcRenderer.invoke('set-taskbar-icon', hidden),
  getPlatform: () => process.platform,
  getSystemAudioSources: async () => {
    try {
      console.log("Getting system audio sources...");
      // Use IPC to get sources from the main process
      const sources = await ipcRenderer.invoke('GET_SYSTEM_AUDIO_SOURCES');
      console.log(`Found ${sources?.length || 0} system audio sources`);
      return sources || [];
    } catch (error) {
      console.error('Error getting system audio sources:', error);
      return [];
    }
  },
  getApplicationSources: async () => {
    try {
      console.log("Getting application sources...");
      // Use IPC to get sources from the main process
      const sources = await ipcRenderer.invoke('GET_APPLICATION_SOURCES');
      console.log(`Found ${sources?.length || 0} application sources`);
      return sources || [];
    } catch (error) {
      console.error('Error getting application sources:', error);
      return [];
    }
  },
  
  getScreenSources: async () => {
    try {
      console.log("Getting screen sources...");
      // Use IPC to get sources from the main process
      const sources = await ipcRenderer.invoke('GET_SCREEN_SOURCES');
      console.log(`Found ${sources?.length || 0} screen sources`);
      return sources || [];
    } catch (error) {
      console.error('Error getting screen sources:', error);
      return [];
    }
  },
  saveTempAudio: async (audioBlob: Blob) => {
    try {
      // Convert the Blob to an ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer()
      // Convert ArrayBuffer to Buffer
      const buffer = Buffer.from(arrayBuffer)
      // Send to Main process
      return ipcRenderer.invoke('save-temp-audio', buffer)
    } catch (error) {
      console.error('Error converting audio data:', error)
      throw error
    }
  },
  runWhisperCLI: (filePath: string, modelName: string) => {
    return ipcRenderer.invoke('run-whisper-cli', filePath, modelName)
  },
  cleanupTempFile: (filePath: string) => {
    return ipcRenderer.invoke('cleanup-temp-file', filePath)
  },
  generateTeleprompterResponse: (transcript: string) => {
    return ipcRenderer.invoke('generate-teleprompter-response', transcript)
  },
  generateChatResponse: (options: { 
    model: string; 
    message: string;
    history?: Array<{role: string; content: string}>
    useSearch?: boolean;
  }) => {
    return ipcRenderer.invoke("generate-chat-response", options)
  },
  getHotkeys: () => {
    return ipcRenderer.invoke('get-hotkeys')
  },
  setHotkey: (data: { key: string; value: string }) => {
    return ipcRenderer.invoke('set-hotkey', data)
  },
  onHotkeysChanged: (callback: () => void) => {
    const subscription = () => callback()
    ipcRenderer.on("hotkeys-changed", subscription)
    return () => {
      ipcRenderer.removeListener("hotkeys-changed", subscription)
    }
  }
} as ElectronAPI

// Before exposing the API
console.log(
  "About to expose electronAPI with methods:",
  Object.keys(electronAPI)
)

// Expose the API
contextBridge.exposeInMainWorld("electronAPI", electronAPI)

// Expose environment variables safely to the renderer process
contextBridge.exposeInMainWorld("ENV_REACT_APP_API_BASE_URL", process.env.REACT_APP_API_BASE_URL || '');
contextBridge.exposeInMainWorld("OPENAI_API_KEY", process.env.OPENAI_API_KEY || '');
contextBridge.exposeInMainWorld("OPENAI_API_URL", process.env.OPENAI_API_URL || 'https://api.openai.com/v1');

console.log("electronAPI and environment variables exposed to window")

// Add this focus restoration handler
ipcRenderer.on("restore-focus", () => {
  // Try to focus the active element if it exists
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && typeof activeElement.focus === "function") {
    activeElement.focus()
  }
})

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer: {
    on: (channel: string, func: (...args: any[]) => void) => {
      if (channel === "auth-callback") {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
      }
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      if (channel === "auth-callback") {
        ipcRenderer.removeListener(channel, (event, ...args) => func(...args))
      }
    }
  }
})
