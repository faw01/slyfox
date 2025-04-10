// ipcHandlers.ts

import { ipcMain, shell, app, desktopCapturer } from "electron"
import { randomBytes } from "crypto"
import { createClient } from '@supabase/supabase-js'
import { store, type StoreSchema } from "./store"
import { IIpcHandlerDeps } from "./main"
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

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

  // Toggle main window
  ipcMain.handle("toggle-window", () => {
    try {
      deps.toggleMainWindow()
      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to toggle window" }
    }
  })

  // Toggle STTPanel (teleprompter)
  ipcMain.handle("toggle-stt-panel", () => {
    try {
      const mainWindow = deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-stt-panel")
        return { success: true }
      }
      return { success: false, error: "Main window not found" }
    } catch (error) {
      console.error("Error toggling STT panel:", error)
      return { success: false, error: "Failed to toggle STT panel" }
    }
  })

  // Toggle Chat
  ipcMain.handle("toggle-chat", () => {
    try {
      const mainWindow = deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("toggle-chat")
        return { success: true }
      }
      return { success: false, error: "Main window not found" }
    } catch (error) {
      console.error("Error toggling chat:", error)
      return { success: false, error: "Failed to toggle chat" }
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

  // Add handler for setting problem info
  ipcMain.handle("set-problem-info", (_event, problemInfo: any) => {
    try {
      deps.setProblemInfo(problemInfo)
      return { success: true }
    } catch (error) {
      console.error("Error setting problem info:", error)
      return { error: "Failed to set problem info" }
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

  // Move window handlers
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

  // Define API provider type
  type ApiProvider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'meta' | 'deepgram'

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

  // Whisper CLI handlers
  ipcMain.handle('save-temp-audio', async (_, audioData: Uint8Array) => {
    try {
      const tempDir = path.join(app.getPath('temp'), 'slyfox-whisper');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create a unique file name
      const tempFilePath = path.join(tempDir, `recording-${Date.now()}.wav`);
      
      // Write audio data to file
      fs.writeFileSync(tempFilePath, Buffer.from(audioData));
      
      console.log(`Saved audio chunk (${audioData.length} bytes) to temp file: ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      console.error('Error saving temp audio file:', error);
      throw error;
    }
  });

  ipcMain.handle('run-whisper-cli', async (_, filePath: string, modelName: string) => {
    try {
      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        console.error(`Audio file not found: ${filePath}`);
        return '';
      }
      
      // The output directory will be the same as the input file
      const outputDir = path.dirname(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      const outputFilePath = path.join(outputDir, `${fileName}.txt`);
      
      // Remove previous output file if it exists
      if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
      }

      // Get user's home directory for model path
      const homeDir = os.homedir();
      const modelDir = path.join(homeDir, '.cache', 'whisper');
      
      // Construct whisper command and arguments
      const whisperArgs = [
        filePath,
        '--model', modelName,
        '--model_dir', modelDir,
        '--language', 'en',
        '--task', 'transcribe',
        '--output_dir', outputDir,
        '--output_format', 'txt',
        '--no_speech_threshold', '0.3',
        '--beam_size', '1',
        '--threads', '4',
        '--temperature', '0.0',
        '--word_timestamps', 'True',
        '--verbose', 'True'
      ];
      
      console.log(`Executing whisper command with args:`, whisperArgs);
      
      // Set a timeout to prevent hanging on problematic audio chunks
      const timeoutMs = 30000; // 30 seconds timeout
      
      let stdoutData = '';
      let stderrData = '';
      
      try {
        // Create a promise that will resolve when the process completes or reject on timeout
        const processPromise = new Promise((resolve, reject) => {
          const whisperProcess = spawn('whisper', whisperArgs, {
            env: {
              ...process.env,
              PATH: process.env.PATH
            }
          });
          
          whisperProcess.stdout.on('data', (data: Buffer) => {
            stdoutData += data.toString();
            console.log(`Whisper stdout: ${data}`);
          });
          
          whisperProcess.stderr.on('data', (data: Buffer) => {
            stderrData += data.toString();
            console.log(`Whisper stderr: ${data}`);
          });
          
          whisperProcess.on('close', (code: number | null) => {
            if (code === 0) {
              resolve(true);
            } else {
              reject(new Error(`Process exited with code ${code}`));
            }
          });
          
          whisperProcess.on('error', (err: Error) => {
            reject(err);
          });
        });
        
        // Race the process against the timeout
        await Promise.race([
          processPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Whisper CLI timed out after ${timeoutMs}ms`)), timeoutMs))
        ]);
        
        // Check if output file was created
        if (fs.existsSync(outputFilePath)) {
          const transcription = fs.readFileSync(outputFilePath, 'utf-8').trim();
          if (transcription) {
            console.log(`Transcription result (${transcription.length} chars): ${transcription.substring(0, 40)}...`);
            return transcription;
          }
        }
        
        console.warn('No transcription produced for this audio chunk');
        return '';
        
      } catch (processError) {
        console.error('Error during Whisper CLI execution:', processError);
        console.error('Stdout:', stdoutData);
        console.error('Stderr:', stderrData);
        return '';
      }
      
    } catch (error) {
      console.error('Error running Whisper CLI:', error);
      return '';
      
    } finally {
      // Always try to clean up the input file, regardless of success or failure
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up input file: ${filePath}`);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up input file:', cleanupError);
      }
    }
  });

  ipcMain.handle('cleanup-temp-file', async (_, filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        
        // Also try to clean up the .txt file if it exists
        const txtFile = filePath.replace(/\.[^/.]+$/, '.txt');
        if (fs.existsSync(txtFile)) {
          fs.unlinkSync(txtFile);
        }
        
        console.log(`Cleaned up temp file: ${filePath}`);
      }
    } catch (error) {
      console.error('Error cleaning up temp file:', error);
      throw error;
    }
  });

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

  // Content protection settings
  ipcMain.handle("set-content-protection", (_, enabled) => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        // Save the setting
        console.log(`Setting content protection to: ${enabled}`)
        store.set("contentProtection", enabled)

        // Apply the setting
        mainWindow.setContentProtection(enabled)
        mainWindow.setHiddenInMissionControl(enabled)
        mainWindow.setVisibleOnAllWorkspaces(enabled, {
          visibleOnFullScreen: enabled
        })
        mainWindow.setAlwaysOnTop(enabled, "floating", 1)
        
        // No longer controlling taskbar visibility here
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

  // New handler for taskbar icon visibility
  ipcMain.handle("set-taskbar-icon", (_, hidden) => {
    const mainWindow = deps.getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        // Save the setting
        console.log(`Setting taskbar icon hidden: ${hidden}`)
        store.set("taskbarIconHidden", hidden)

        // Apply the setting based on platform
        if (process.platform === 'darwin') {
          // On macOS, use the dock API
          console.log(`Using macOS dock API. Platform: ${process.platform}, hidden: ${hidden}`)
          if (hidden) {
            console.log('Hiding dock icon')
            app.dock.hide()
          } else {
            console.log('Showing dock icon')
            app.dock.show()
          }
        } else {
          // On Windows/Linux, use setSkipTaskbar
          console.log(`Using setSkipTaskbar. Platform: ${process.platform}, hidden: ${hidden}`)
          mainWindow.setSkipTaskbar(hidden)
        }
        
        return { success: true }
      } catch (error) {
        console.error('Error setting taskbar icon visibility:', error)
        return { error: 'Failed to set taskbar icon visibility' }
      }
    }
    return { error: 'No main window available' }
  })

  // Get taskbar icon state
  ipcMain.handle("get-taskbar-icon", () => {
    try {
      const isHidden = store.get("taskbarIconHidden") ?? false
      
      // For macOS, also check the actual dock state
      if (process.platform === 'darwin') {
        const dockVisible = app.dock.isVisible()
        console.log(`macOS dock status - store:${isHidden}, dock.isVisible:${dockVisible}`)
        return isHidden && !dockVisible
      }
      
      return isHidden
    } catch (error) {
      console.error('Error getting taskbar icon state:', error)
      return false
    }
  })

  // Window listing handler
  ipcMain.handle("get-application-windows", async () => {
    try {
      const { BrowserWindow } = require('electron');
      
      // Get all windows and filter for visible ones
      const allWindows = BrowserWindow.getAllWindows().filter((win: Electron.BrowserWindow) => {
        // Only include windows that are visible
        return win.isVisible();
      });
      
      // Map windows to a simplified structure with needed properties
      const visibleWindows = allWindows.map((win: Electron.BrowserWindow) => {
        const bounds = win.getBounds();
        return {
          id: win.id,
          title: win.getTitle() || 'Unknown Window',
          bounds: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height
          },
          // Include additional properties that might be useful
          isMinimized: win.isMinimized(),
          isMaximized: win.isMaximized(),
          isFullScreen: win.isFullScreen()
        };
      });
      
      // If no windows found, return an empty array
      return visibleWindows;
    } catch (error) {
      console.error("Error getting application windows:", error);
      return [];
    }
  });

  // Desktop Capturer Handlers
  ipcMain.handle('GET_SYSTEM_AUDIO_SOURCES', async () => {
    try {
      console.log("Main process: Getting system audio sources...");
      // Get screen sources
      const screenSources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 320, height: 180 }
      });
      
      // Get audio input devices including BlackHole
      const audioDevices = await getAudioInputDevices();
      
      // Combine sources
      const allSources = [
        ...screenSources.map(source => ({
          id: source.id,
          name: source.name,
          thumbnailURL: source.thumbnail.toDataURL(),
          type: 'screen'
        })),
        ...audioDevices
      ];
      
      console.log(`Main process: Found ${allSources.length} system audio sources (${screenSources.length} screens, ${audioDevices.length} audio devices)`);
      return allSources;
    } catch (error) {
      console.error('Main process: Error getting system audio sources:', error);
      return [];
    }
  });

  // Get audio input devices
  async function getAudioInputDevices() {
    try {
      console.log("Getting audio input devices...");
      // On macOS, we need to use the systemPreferences API
      if (process.platform === 'darwin') {
        // Check if BlackHole is installed
        const devices = [];
        
        try {
          // Use execSync to run a command that lists audio devices
          const { execSync } = require('child_process');
          const audioDevicesOutput = execSync('system_profiler SPAudioDataType').toString();
          
          // Parse the output to find BlackHole
          if (audioDevicesOutput.includes('BlackHole')) {
            console.log("Found BlackHole audio device");
            devices.push({
              id: 'blackhole-audio-device',
              name: 'BlackHole 2ch (System Audio)',
              type: 'audio'
            });
          }
        } catch (error) {
          console.error("Error checking for BlackHole devices:", error);
        }
        
        return devices;
      }
      
      // For other platforms, return an empty array for now
      // This could be extended in the future
      return [];
    } catch (error) {
      console.error("Error getting audio input devices:", error);
      return [];
    }
  }

  ipcMain.handle('GET_APPLICATION_SOURCES', async () => {
    try {
      console.log("Main process: Getting application sources...");
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 320, height: 180 }
      });
      
      console.log(`Main process: Found ${sources.length} application sources`);
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnailURL: source.thumbnail.toDataURL(),
        appIcon: source.appIcon?.toDataURL()
      }));
    } catch (error) {
      console.error('Main process: Error getting application sources:', error);
      return [];
    }
  });

  ipcMain.handle('GET_SCREEN_SOURCES', async () => {
    try {
      console.log("Main process: Getting screen sources...");
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 320, height: 180 }
      });
      
      console.log(`Main process: Found ${sources.length} screen sources`);
      return sources.map(source => ({
        id: source.id,
        name: source.name,
        thumbnailURL: source.thumbnail.toDataURL(),
        type: 'screen'
      }));
    } catch (error) {
      console.error('Main process: Error getting screen sources:', error);
      return [];
    }
  });

  // Teleprompter response handler
  ipcMain.handle('generate-teleprompter-response', async (_, transcript: string) => {
    if (!deps.teleprompterHelper) {
      console.error('Teleprompter helper not initialized');
      return { success: false, error: 'Teleprompter helper not initialized' };
    }
    
    try {
      return await deps.teleprompterHelper.generateResponse(transcript);
    } catch (error) {
      console.error('Error generating teleprompter response:', error);
      return { success: false, error: 'Failed to generate response' };
    }
  });
  
  // Chat response handler
  ipcMain.handle('generate-chat-response', async (_, options: { 
    model: string; 
    message: string;
    history?: Array<{role: string; content: string}>
  }) => {
    if (!deps.chatHelper) {
      console.error('Chat helper not initialized');
      return { success: false, error: 'Chat helper not initialized' };
    }
    
    try {
      return await deps.chatHelper.generateResponse(options);
    } catch (error) {
      console.error('Error generating chat response:', error);
      return { success: false, error: 'Failed to generate response' };
    }
  });

  // Get hotkeys
  ipcMain.handle("get-hotkeys", () => {
    try {
      return store.get('hotkeys')
    } catch (error) {
      console.error("Error getting hotkeys:", error)
      return null
    }
  })

  // Set a specific hotkey
  ipcMain.handle("set-hotkey", (_, data: { key: keyof StoreSchema['hotkeys']; value: string }) => {
    try {
      const { key, value } = data
      const hotkeys = store.get('hotkeys')
      hotkeys[key] = value
      store.set('hotkeys', hotkeys)
      
      // Signal main process to update shortcuts
      if (typeof deps.updateHotkeys === 'function') {
        deps.updateHotkeys()
      }
      
      // Notify all renderer processes that hotkeys have changed
      const mainWindow = deps.getMainWindow()
      if (mainWindow) {
        mainWindow.webContents.send("hotkeys-changed")
      }
      
      return { success: true }
    } catch (error) {
      console.error("Error setting hotkey:", error)
      return { success: false, error: "Failed to set hotkey" }
    }
  })
}
