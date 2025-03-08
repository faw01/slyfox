contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods ...
  
  // API Keys
  getApiKeys: () => ipcRenderer.invoke('get-api-keys'),
  setApiKey: (provider: string, key: string) =>
    ipcRenderer.invoke('set-api-key', { provider, key }),
  clearApiKey: (provider: string) => ipcRenderer.invoke('clear-api-key', provider),
  
  // Whisper CLI integration
  saveTempAudio: async (audioBlob: Blob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return ipcRenderer.invoke('save-temp-audio', uint8Array);
  },
  runWhisperCLI: (filePath: string, modelName: string) => 
    ipcRenderer.invoke('run-whisper-cli', filePath, modelName),
  cleanupTempFile: (filePath: string) => 
    ipcRenderer.invoke('cleanup-temp-file', filePath),
  
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getElectronVersion: () => ipcRenderer.invoke('get-electron-version'),
  
  // ... more methods ...
}) 