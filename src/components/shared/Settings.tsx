import React, { useEffect, useState } from 'react'
import { LanguageSelector } from './LanguageSelector'
import { ModelSelector } from './ModelSelector'
import VisionModelSelector from './VisionModelSelector'
import STTModelSelector from './STTModelSelector'
import { useToast } from '../../contexts/toast'

interface SettingsProps {
  currentLanguage: string
  setLanguage: (language: string) => void
  currentModel: string
  setModel: (model: string) => void
  isLocked?: boolean
}

interface ApiKeys {
  openai?: string
  anthropic?: string
  google?: string
  deepseek?: string
  xai?: string
  meta?: string
  alibaba?: string
  deepgram?: string
}

interface Hotkey {
  label: string
  key: string
  description: string
  defaultValue: string
}

const HOTKEYS: Hotkey[] = [
  { key: 'up', label: 'Move Up', description: 'Move window up', defaultValue: 'CommandOrControl+Up' },
  { key: 'down', label: 'Move Down', description: 'Move window down', defaultValue: 'CommandOrControl+Down' },
  { key: 'left', label: 'Move Left', description: 'Move window left', defaultValue: 'CommandOrControl+Left' },
  { key: 'right', label: 'Move Right', description: 'Move window right', defaultValue: 'CommandOrControl+Right' },
  { key: 'screenshot', label: 'Screenshot', description: 'Take a screenshot', defaultValue: 'CommandOrControl+H' },
  { key: 'solve', label: 'Solve', description: 'Process screenshots', defaultValue: 'CommandOrControl+Enter' },
  { key: 'reset', label: 'Reset', description: 'Reset all settings', defaultValue: 'CommandOrControl+R' },
  { key: 'hideApp', label: 'Toggle Window', description: 'Toggle window visibility', defaultValue: 'CommandOrControl+B' }
]

export const Settings: React.FC<SettingsProps> = ({
  currentLanguage,
  setLanguage,
  currentModel,
  setModel,
  isLocked = true
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({})
  const [appVersion, setAppVersion] = useState<string>("")
  const [electronVersion, setElectronVersion] = useState<string>("")
  const [currentVisionModel, setCurrentVisionModel] = useState<string>(() => {
    if (!window.__VISION_MODEL__) {
      window.__VISION_MODEL__ = "gpt-4o-mini"
    }
    return window.__VISION_MODEL__
  })
  const [currentSTTModel, setCurrentSTTModel] = useState<string>(() => {
    if (!window.__STT_MODEL__) {
      window.__STT_MODEL__ = "deepgram-nova-3"
    }
    return window.__STT_MODEL__
  })
  const [opacity, setOpacity] = useState(1.0)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isContentProtectionEnabled, setIsContentProtectionEnabled] = useState(true)
  const [isTaskbarIconHidden, setIsTaskbarIconHidden] = useState(false)
  const { showToast } = useToast()
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false)
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false)
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({})
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null)
  const [tempHotkeyValue, setTempHotkeyValue] = useState<string>("")
  const [activeModifiers, setActiveModifiers] = useState<string[]>([])
  const [nonModifierKey, setNonModifierKey] = useState<string>("")

  // Helper function to convert a key to its symbol representation
  const formatKeySymbol = (key: string): string => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    let symbol = key;
    
    // Convert common keys to symbols
    switch (key.toLowerCase()) {
      case 'commandorcontrol':
        symbol = isMac ? '⌘' : 'Ctrl';
        break;
      case 'command':
      case 'cmd':
        symbol = '⌘';
        break;
      case 'control':
      case 'ctrl':
        symbol = 'Ctrl';
        break;
      case 'alt':
      case 'option':
        symbol = isMac ? '⌥' : 'Alt';
        break;
      case 'shift':
        symbol = '⇧';
        break;
      case 'up':
        symbol = '↑';
        break;
      case 'down':
        symbol = '↓';
        break;
      case 'left':
        symbol = '←';
        break;
      case 'right':
        symbol = '→';
        break;
      case 'enter':
        symbol = '↵';
        break;
      case 'backspace':
        symbol = '⌫';
        break;
      case 'delete':
        symbol = '⌦';
        break;
      case 'escape':
      case 'esc':
        symbol = 'Esc';
        break;
      case 'space':
        symbol = 'Space';
        break;
      case 'tab':
        symbol = '⇥';
        break;
      case 'capslock':
        symbol = '⇪';
        break;
      case 'meta':
        symbol = '⌘';
        break;
      default:
        // For single letters, just use uppercase
        if (key.length === 1) {
          symbol = key.toUpperCase();
        }
    }
    
    return symbol;
  };

  // Function to convert keyboard shortcut text to symbols
  const formatHotkeyToSymbols = (shortcut: string): React.ReactNode => {
    if (!shortcut) return null;
    
    const parts = shortcut.split('+').map(part => part.trim());
    
    return (
      <span className="flex items-center gap-1">
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
              {formatKeySymbol(part)}
            </span>
          </React.Fragment>
        ))}
      </span>
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!editingHotkey) return;
    
    e.preventDefault();
    
    // Get the main key (non-modifier)
    let key = e.key;
    
    // Map some special keys to their Electron accelerator names
    if (key === ' ') key = 'Space';
    else if (key === 'ArrowUp') key = 'Up';
    else if (key === 'ArrowDown') key = 'Down';
    else if (key === 'ArrowLeft') key = 'Left';
    else if (key === 'ArrowRight') key = 'Right';
    else if (key === 'Escape') key = 'Esc';
    else if (key === 'Control') key = 'Ctrl';
    else if (key === 'Meta') key = 'Command';
    else if (key.length === 1) key = key.toUpperCase(); // Capitalize single character keys
    
    // Skip if it's just a modifier key press
    if (['Control', 'Alt', 'Shift', 'Meta', 'Command', 'Ctrl'].includes(key)) {
      // Build array of currently pressed modifiers
      const modifiers = [];
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.metaKey) modifiers.push('Command');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      
      setActiveModifiers(modifiers);
      return;
    }
    
    // Build array of currently pressed modifiers for non-modifier keys
    const modifiers = [];
    if (e.ctrlKey && e.metaKey) {
      modifiers.push('CommandOrControl');
    } else {
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.metaKey) modifiers.push('Command');
    }
    if (e.altKey) modifiers.push('Alt');
    if (e.shiftKey) modifiers.push('Shift');
    
    setActiveModifiers(modifiers);
    setNonModifierKey(key);
    
    // Create the full hotkey string in Electron accelerator format
    let hotkeyValue = '';
    if (modifiers.length > 0) {
      hotkeyValue = modifiers.join('+');
      if (key) {
        hotkeyValue += `+${key}`;
      }
    } else if (key) {
      hotkeyValue = key;
    }
    
    setTempHotkeyValue(hotkeyValue);
    
    // Auto-save immediately when a valid hotkey (modifier + key) is entered
    if (modifiers.length > 0 && key) {
      // Check if this hotkey is already in use by another action
      const conflictingHotkeyKey = Object.entries(hotkeys).find(
        ([existingKey, existingValue]) => existingValue === hotkeyValue && existingKey !== editingHotkey
      )?.[0];
      
      if (conflictingHotkeyKey) {
        // Find the label for the conflicting hotkey
        const conflictingHotkey = HOTKEYS.find(h => h.key === conflictingHotkeyKey);
        const conflictingLabel = conflictingHotkey ? conflictingHotkey.label : conflictingHotkeyKey;
        
        // Show error toast
        showToast(
          'Hotkey Conflict', 
          `This key combination is already used for "${conflictingLabel}". Please try a different combination.`, 
          'error'
        );
        
        // Keep editing mode open
        return;
      }
      
      // If no conflict, save the hotkey
      handleHotkeyChange(editingHotkey, hotkeyValue);
      setEditingHotkey(null);
      setActiveModifiers([]);
      setNonModifierKey("");
    }
  };

  const startEditingHotkey = (key: string, defaultValue: string) => {
    setEditingHotkey(key);
    setTempHotkeyValue("");
    setActiveModifiers([]);
    setNonModifierKey("");
    
    // Use setTimeout to ensure the element is rendered before focusing
    setTimeout(() => {
      const element = document.getElementById(`hotkey-edit-${key}`);
      if (element) {
        element.focus();
      }
    }, 50);
  };

  const cancelEditingHotkey = () => {
    setEditingHotkey(null);
    setTempHotkeyValue("");
    setActiveModifiers([]);
    setNonModifierKey("");
  };

  const saveHotkey = (key: string) => {
    if (tempHotkeyValue) {
      handleHotkeyChange(key, tempHotkeyValue);
    }
    setEditingHotkey(null);
    setTempHotkeyValue("");
    setActiveModifiers([]);
    setNonModifierKey("");
  };

  useEffect(() => {
    loadApiKeys()
    loadOpacity()
    loadTheme()
    loadAppVersion()
    loadElectronVersion()
    loadContentProtection()
    loadTaskbarIcon()
    loadHotkeys()
  }, [])

  const loadApiKeys = async () => {
    try {
      const keys = await window.electronAPI.getApiKeys()
      setApiKeys(keys)
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const loadOpacity = async () => {
    try {
      const savedOpacity = await window.electronAPI.getOpacity()
      setOpacity(savedOpacity)
    } catch (error) {
      console.error('Failed to load opacity:', error)
    }
  }

  const loadTheme = async () => {
    try {
      const savedTheme = await window.electronAPI.getTheme()
      setTheme(savedTheme)
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  const loadAppVersion = async () => {
    try {
      const version = await window.electronAPI.getAppVersion()
      setAppVersion(version)
    } catch (error) {
      console.error('Failed to load app version:', error)
    }
  }

  const loadElectronVersion = async () => {
    try {
      const version = await window.electronAPI.getElectronVersion()
      setElectronVersion(version)
    } catch (error) {
      console.error('Failed to load Electron version:', error)
    }
  }

  const loadContentProtection = async () => {
    try {
      const enabled = await window.electronAPI.getContentProtection()
      setIsContentProtectionEnabled(enabled)
    } catch (error) {
      console.error('Failed to load content protection setting:', error)
    }
  }

  const loadTaskbarIcon = async () => {
    try {
      const hidden = await window.electronAPI.getTaskbarIcon()
      setIsTaskbarIconHidden(hidden)
    } catch (error) {
      console.error('Failed to load taskbar icon setting:', error)
    }
  }

  const loadHotkeys = () => {
    // Initialize with default values
    const defaultHotkeys = HOTKEYS.reduce((acc, hotkey) => {
      acc[hotkey.key] = hotkey.defaultValue
      return acc
    }, {} as Record<string, string>)
    setHotkeys(defaultHotkeys)
  }

  const handleOpacityChange = async (newOpacity: number) => {
    if (isLocked) return
    try {
      await window.electronAPI.setOpacity(newOpacity)
      setOpacity(newOpacity)
    } catch (error) {
      console.error('Failed to update opacity:', error)
    }
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (isLocked) return
    try {
      await window.electronAPI.setTheme(newTheme)
      setTheme(newTheme)
    } catch (error) {
      console.error('Failed to update theme:', error)
    }
  }

  const handleApiKeyChange = async (provider: keyof ApiKeys, key: string) => {
    if (isLocked) return
    try {
      await window.electronAPI.setApiKey(provider, key)
      setApiKeys(prev => ({ ...prev, [provider]: key }))
      showToast('Success', `${provider.toUpperCase()} API key updated`, 'success')
    } catch (error) {
      showToast('Error', `Failed to update ${provider.toUpperCase()} API key`, 'error')
    }
  }

  const handleClearApiKey = async (provider: keyof ApiKeys) => {
    if (isLocked) return
    try {
      await window.electronAPI.clearApiKey(provider)
      setApiKeys(prev => {
        const newKeys = { ...prev }
        delete newKeys[provider]
        return newKeys
      })
      showToast('Success', `${provider.toUpperCase()} API key removed`, 'success')
    } catch (error) {
      showToast('Error', `Failed to remove ${provider.toUpperCase()} API key`, 'error')
    }
  }

  const handleContentProtectionToggle = async () => {
    if (isLocked) return
    try {
      const newState = !isContentProtectionEnabled
      const result = await window.electronAPI.setContentProtection(newState)
      if (result.success) {
        setIsContentProtectionEnabled(newState)
      } else {
        console.error('Failed to toggle content protection:', result.error)
      }
    } catch (error) {
      console.error('Failed to toggle content protection:', error)
    }
  }

  const handleHotkeyChange = (key: string, value: string) => {
    if (isLocked) return
    setHotkeys(prev => ({ ...prev, [key]: value }))
  }

  const handleTaskbarIconToggle = async () => {
    if (isLocked) return
    try {
      const newState = !isTaskbarIconHidden
      const result = await window.electronAPI.setTaskbarIcon(newState)
      if (result.success) {
        setIsTaskbarIconHidden(newState)
      } else {
        console.error('Failed to toggle taskbar icon:', result.error)
      }
    } catch (error) {
      console.error('Failed to toggle taskbar icon:', error)
    }
  }

  return (
    <div className={`space-y-4 overflow-hidden ${isLocked ? 'opacity-50' : ''}`}>
      {/* API Keys Section */}
      <div className="space-y-3">
        <h3 className="font-medium select-none cursor-default">API Keys</h3>
        <div className="px-2 space-y-2">
          <button 
            onClick={() => !isLocked && setIsApiKeysOpen(!isApiKeysOpen)}
            className={`w-full flex items-center justify-between text-[11px] leading-none text-white/90 hover:text-white transition-colors select-none cursor-default ${isLocked ? 'pointer-events-none' : ''}`}
          >
            <span className="select-none cursor-default">Configure Keys</span>
            <span className={`transform transition-transform duration-200 select-none cursor-default ${isApiKeysOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          <div className={`space-y-2 overflow-hidden transition-all duration-200 ${isApiKeysOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {[
              { key: 'openai', label: 'OpenAI API Key' },
              { key: 'anthropic', label: 'Anthropic API Key' },
              { key: 'google', label: 'Google API Key' },
              { key: 'deepseek', label: 'DeepSeek API Key' },
              { key: 'xai', label: 'xAI API Key' },
              { key: 'alibaba', label: 'Alibaba API Key' },
              { key: 'deepgram', label: 'Deepgram API Key' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <input
                    type="password"
                    id={`${key}-api-key`}
                    placeholder=" "
                    value={apiKeys[key as keyof ApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(key as keyof ApiKeys, e.target.value)}
                    onSelect={(e) => e.preventDefault()}
                    onMouseDown={(e) => {
                      if (e.detail > 1) { // Prevent double-click selection
                        e.preventDefault();
                      }
                    }}
                    onKeyDown={(e) => {
                      // Prevent keyboard shortcuts for selection (Ctrl+A, etc.)
                      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
                        e.preventDefault();
                      }
                    }}
                    onContextMenu={(e) => e.preventDefault()} // Disable right-click menu
                    className="w-full bg-white/10 rounded px-2 pt-3 pb-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 transition-colors peer placeholder-transparent select-none cursor-default"
                  />
                  <label
                    htmlFor={`${key}-api-key`}
                    className="absolute left-2 top-0.5 text-[7px] leading-relaxed text-white/70 transition-all 
                             peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/50 peer-placeholder-shown:top-[7px]
                             peer-focus:top-0.5 peer-focus:text-[7px] peer-focus:text-white/70 select-none cursor-default"
                  >
                    {label}
                  </label>
                </div>
                {apiKeys[key as keyof ApiKeys] && (
                  <button
                    onClick={() => handleClearApiKey(key as keyof ApiKeys)}
                    className="text-white/50 hover:text-white/90 transition-colors select-none cursor-default px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hotkeys Section */}
      <div className="space-y-3">
        <h3 className="font-medium select-none cursor-default">Hotkeys</h3>
        <div className="px-2 space-y-2">
          <button 
            onClick={() => !isLocked && setIsHotkeysOpen(!isHotkeysOpen)}
            className={`w-full flex items-center justify-between text-[11px] leading-none text-white/90 hover:text-white transition-colors select-none cursor-default ${isLocked ? 'pointer-events-none' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="select-none cursor-default">Configure Hotkeys</span>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 max-w-[15rem] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg select-none cursor-default">
                    A valid hotkey is a combination of a modifier key and a key.
                  </div>
                </div>
              </div>
            </div>
            <span className={`transform transition-transform duration-200 select-none cursor-default ${isHotkeysOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          <div className={`space-y-2 overflow-hidden transition-all duration-200 ${isHotkeysOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {HOTKEYS.map(({ key, label, description, defaultValue }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="relative flex-1">
                  {editingHotkey === key ? (
                    <div 
                      id={`hotkey-edit-${key}`}
                      className="w-full bg-yellow-500/20 rounded px-2 pt-3 pb-1 text-[11px] leading-none outline-none border border-yellow-500/30 transition-colors flex items-center min-h-[30px] cursor-default"
                      tabIndex={0}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    >
                      {activeModifiers.length > 0 || nonModifierKey ? (
                        <span className="flex items-center gap-1">
                          {activeModifiers.map((mod, index) => (
                            <span key={index} className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {formatKeySymbol(mod)}
                            </span>
                          ))}
                          {nonModifierKey && (
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {formatKeySymbol(nonModifierKey)}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-yellow-300 select-none cursor-default">Press keys for {label}...</span>
                      )}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {tempHotkeyValue && (
                          <button
                            onClick={() => saveHotkey(key)}
                            className="text-white/70 hover:text-white/90 transition-colors cursor-default"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="w-full bg-white/10 rounded px-2 pt-3 pb-1 text-[11px] leading-none outline-none border border-white/10 hover:border-white/20 transition-colors flex items-center min-h-[30px] cursor-default"
                    >
                      {formatHotkeyToSymbols(hotkeys[key] || defaultValue)}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" onClick={() => startEditingHotkey(key, defaultValue)}>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  <label
                    htmlFor={`hotkey-${key}`}
                    className="absolute left-2 top-0.5 text-[7px] leading-relaxed text-white/70 select-none cursor-default"
                  >
                    {label}
                  </label>
                </div>
                {editingHotkey === key ? (
                  <button
                    onClick={cancelEditingHotkey}
                    className="text-white/50 hover:text-white/90 transition-colors select-none cursor-default px-1"
                  >
                    ✕
                  </button>
                ) : (
                  <button
                    onClick={() => handleHotkeyChange(key, defaultValue)}
                    className="text-white/50 hover:text-white/90 transition-colors select-none cursor-default px-1"
                  >
                    ↺
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Privacy Section */}
      <div className="space-y-3">
        <h3 className="font-medium select-none cursor-default">Privacy</h3>
        <div className="px-2 space-y-4">
          {/* Content Protection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] leading-none text-white/90 select-none cursor-default">Content Protection</h4>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg select-none cursor-default">
                    Disabling content protection will make the application visible in all screenshots and to all screensharing software.
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleContentProtectionToggle}
              disabled={isLocked}
              className={`w-full px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none cursor-default ${
                isContentProtectionEnabled 
                  ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="relative w-full flex items-center justify-center">
                <span className="select-none cursor-default">{isContentProtectionEnabled ? 'Content Protection Enabled' : 'Content Protection Disabled'}</span>
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    {isContentProtectionEnabled ? (
                      <>
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                        <line x1="2" x2="22" y1="2" y2="22"></line>
                      </>
                    ) : (
                      <>
                        <path d="M12 5c-7.33 0-10 7-10 7s2.67 7 10 7 10-7 10-7-2.67-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </>
                    )}
                  </svg>
                </div>
              </div>
            </button>
          </div>

          {/* Taskbar Icon */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] leading-none text-white/90 select-none cursor-default">Taskbar Icon</h4>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full right-[-150px] mb-2 w-60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg select-none cursor-default">
                    If you are required to share your full screen during an interview we recommend hiding the taskbar icon.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={handleTaskbarIconToggle}
                disabled={isLocked}
                className={`w-full px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none cursor-default ${
                  isTaskbarIconHidden 
                    ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                    : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <div className="relative w-full flex items-center justify-center">
                  <span className="select-none cursor-default">{isTaskbarIconHidden ? 'Taskbar Icon Hidden' : 'Taskbar Icon Visible'}</span>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      {isTaskbarIconHidden ? (
                        <>
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
                          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
                          <line x1="2" x2="22" y1="2" y2="22"></line>
                        </>
                      ) : (
                        <>
                          <path d="M12 5c-7.33 0-10 7-10 7s2.67 7 10 7 10-7 10-7-2.67-7-10-7z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Appearance Section */}
      <div className="space-y-3">
        <h3 className="font-medium select-none cursor-default">Appearance</h3>
        <div className="px-2 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-[11px] leading-none text-white/90 select-none cursor-default">Theme</label>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-auto opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white/90 text-[10px] whitespace-nowrap leading-relaxed p-2 rounded-md shadow-lg select-none cursor-default">
                    Broken
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleThemeChange('light')}
                className={`px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none cursor-default ${
                  theme === 'light'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none cursor-default ${
                  theme === 'dark'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Dark
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
            <label className="text-[11px] leading-none text-white/90 select-none cursor-default">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-default
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-400
                          [&::-webkit-slider-thumb]:hover:bg-neutral-300 [&::-webkit-slider-thumb]:transition-colors
                          [&::-webkit-slider-thumb]:border-none"
              />
              <span className="text-[11px] leading-none text-white/90 min-w-[2.5rem] select-none cursor-default">{Math.round(opacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="border-t border-white/10 pt-3 select-none space-y-3">
        <h3 className="font-medium cursor-default">Preferences</h3>
        <div className={isLocked ? 'pointer-events-none' : ''}>
          <LanguageSelector
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />
          <ModelSelector
            currentModel={currentModel}
            setModel={setModel}
          />
          <VisionModelSelector
            currentVisionModel={currentVisionModel}
            setCurrentVisionModel={setCurrentVisionModel}
          />
          <STTModelSelector
            currentSTTModel={currentSTTModel}
            setSTTModel={setCurrentSTTModel}
          />
        </div>
      </div>
    </div>
  )
} 