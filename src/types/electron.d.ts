export interface APIKeys {
  openai?: string
  anthropic?: string
  google?: string
  deepseek?: string
  meta?: string
  deepgram?: string
}

export interface ElectronAPI {
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
  onToggleSTTPanel: (callback: () => void) => () => void
  openExternal: (url: string) => void
  toggleMainWindow: () => Promise<{ success: boolean; error?: string }>
  toggleSTTPanel: () => Promise<{ success: boolean; error?: string }>
  triggerScreenshot: () => Promise<{ success: boolean; error?: string }>
  triggerProcessScreenshots: () => Promise<{ success: boolean; error?: string }>
  triggerReset: () => Promise<{ success: boolean; error?: string }>
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
  setInitialCredits: (credits: number) => Promise<void>
  onCreditsUpdated: (callback: (credits: number) => void) => () => void
  onOutOfCredits: (callback: () => void) => () => void
  openSettingsPortal: () => Promise<void>
  setModel: (model: string) => Promise<{ success: boolean; error?: string }>
  getPlatform: () => string

  // Theme methods
  getTheme: () => Promise<'light' | 'dark'>
  setTheme: (theme: 'light' | 'dark') => Promise<void>

  // Opacity methods
  getOpacity: () => Promise<number>
  setOpacity: (opacity: number) => Promise<void>

  // Api key management
  getApiKeys: () => Promise<APIKeys>
  setApiKey: (provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'meta' | 'deepgram', key: string) => Promise<void>
  clearApiKey: (provider: 'openai' | 'anthropic' | 'google' | 'deepseek' | 'meta' | 'deepgram') => Promise<void>

  // Whisper CLI methods
  saveTempAudio: (audioData: Blob) => Promise<string>
  runWhisperCLI: (filePath: string, modelName: string) => Promise<string>
  cleanupTempFile: (filePath: string) => Promise<void>

  // Add this to the ElectronAPI interface
  getAppVersion: () => Promise<string>
  getElectronVersion: () => Promise<string>

  // Content Protection methods
  getContentProtection: () => Promise<boolean>
  setContentProtection: (enabled: boolean) => Promise<{ success: boolean; error?: string }>
  
  // Taskbar Icon methods
  getTaskbarIcon: () => Promise<boolean>
  setTaskbarIcon: (hidden: boolean) => Promise<{ success: boolean; error?: string }>

  // Chat methods
  generateChatResponse: (options: { 
    model: string; 
    message: string;
    history?: Array<{role: string; content: string}>;
    useSearch?: boolean;
  }) => Promise<{ 
    success: boolean; 
    data?: string; 
    error?: string;
    sources?: Array<{title?: string; url: string}>;
  }>
  onToggleChat: (callback: () => void) => () => void
  
  // Teleprompter methods
  generateTeleprompterResponse: (transcript: string) => Promise<{ success: boolean; data?: string; error?: string }>

  // Hotkey methods
  getHotkeys: () => Promise<Record<string, string>>
  setHotkey: (data: { key: string; value: string }) => Promise<{ success: boolean; error?: string }>
  onHotkeysChanged: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
    electron: {
      ipcRenderer: {
        on: (channel: string, func: (...args: any[]) => void) => void
        removeListener: (
          channel: string,
          func: (...args: any[]) => void
        ) => void
      }
    }
    __CREDITS__: number
    __LANGUAGE__: string
    __MODEL__: string
    __VISION_MODEL__: string
    __STT_MODEL__: string
    __CHAT_MODEL__: string
    __TELEPROMPTER_MODEL__: string
    __THEME__: 'light' | 'dark'
  }
}
