/**
 * Audio-related utility functions for the application
 */

/**
 * Detects if the BlackHole audio driver is available using the Electron IPC API
 */
export const detectBlackHoleAudio = async (): Promise<{
  available: boolean;
  sourceId: string;
}> => {
  const result = { available: false, sourceId: '' };
  
  try {
    // Check if we're in an Electron environment
    if (!window.electronAPI) {
      return result;
    }
    
    // Use the IPC API to get system audio sources
    const sources = await window.electronAPI.getSystemAudioSources();
    
    // Filter audio sources for BlackHole
    const audioSources = sources.filter((source: any) => source.type === 'audio');
    const blackholeSource = audioSources.find(
      (source: any) => source.name.includes('BlackHole')
    );
    
    if (blackholeSource) {
      console.log('Found BlackHole audio device:', blackholeSource);
      result.available = true;
      result.sourceId = blackholeSource.id;
    } else {
      console.log('BlackHole audio device not found');
    }
  } catch (error) {
    console.error('Error detecting BlackHole audio:', error);
  }
  
  return result;
};

/**
 * Provides guidance on how to install BlackHole on macOS
 */
export const getBlackHoleInstallationInstructions = (): string => {
  return `
    To capture system audio, install BlackHole:
    
    1. Install via Homebrew: brew install blackhole-2ch
    2. Or download from: https://existential.audio/blackhole/
    3. After installation, restart the application
    4. Select BlackHole as your output device in System Settings
  `;
};

/**
 * Determines if the current browser and platform can support system audio capture
 */
export const canCaptureSystemAudio = (): boolean => {
  // Check if we're in a desktop environment
  const isDesktopApp = !!window.electronAPI;
  
  // Currently, reliable system audio capture works best on macOS with BlackHole
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  return isDesktopApp && isMac;
}; 