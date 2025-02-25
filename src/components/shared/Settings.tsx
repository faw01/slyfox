import React, { useEffect, useState } from 'react'
import { LanguageSelector } from './LanguageSelector'
import { ModelSelector } from './ModelSelector'
import VisionModelSelector from './VisionModelSelector'
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
  { key: 'hideApp', label: 'Hide App', description: 'Toggle window visibility', defaultValue: 'CommandOrControl+B' }
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
  const [opacity, setOpacity] = useState(1.0)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [isContentProtectionEnabled, setIsContentProtectionEnabled] = useState(true)
  const [isTaskbarIconHidden, setIsTaskbarIconHidden] = useState(false)
  const { showToast } = useToast()
  const [isApiKeysOpen, setIsApiKeysOpen] = useState(false)
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false)
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({})

  useEffect(() => {
    loadApiKeys()
    loadOpacity()
    loadTheme()
    loadAppVersion()
    loadElectronVersion()
    loadContentProtection()
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

  return (
    <div className={`space-y-4 overflow-hidden ${isLocked ? 'opacity-50' : ''}`}>
      {/* API Keys Section */}
      <div className="space-y-3">
        <h3 className="font-medium">API Keys</h3>
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
              { key: 'openai', label: 'OpenAI API' },
              { key: 'anthropic', label: 'Anthropic API' },
              { key: 'google', label: 'Gemini API' },
              { key: 'deepseek', label: 'DeepSeek API' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="password"
                    id={`${key}-api-key`}
                    placeholder=" "
                    value={apiKeys[key as keyof ApiKeys] || ''}
                    onChange={(e) => handleApiKeyChange(key as keyof ApiKeys, e.target.value)}
                    className="w-full bg-white/10 rounded px-2 pt-3 pb-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 transition-colors peer placeholder-transparent"
                  />
                  <label
                    htmlFor={`${key}-api-key`}
                    className="absolute left-2 top-0.5 text-[10px] leading-relaxed text-white/70 transition-all 
                             peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/50 peer-placeholder-shown:top-[7px]
                             peer-focus:top-0.5 peer-focus:text-[10px] peer-focus:text-white/70"
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
        <h3 className="font-medium">Hotkeys</h3>
        <div className="px-2 space-y-2">
          <button 
            onClick={() => !isLocked && setIsHotkeysOpen(!isHotkeysOpen)}
            className={`w-full flex items-center justify-between text-[11px] leading-none text-white/90 hover:text-white transition-colors select-none cursor-default ${isLocked ? 'pointer-events-none' : ''}`}
          >
            <span className="select-none cursor-default">Configure Hotkeys</span>
            <span className={`transform transition-transform duration-200 select-none cursor-default ${isHotkeysOpen ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          <div className={`space-y-2 overflow-hidden transition-all duration-200 ${isHotkeysOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {HOTKEYS.map(({ key, label, description, defaultValue }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id={`hotkey-${key}`}
                    placeholder=" "
                    value={hotkeys[key] || defaultValue}
                    onChange={(e) => handleHotkeyChange(key, e.target.value)}
                    className="w-full bg-white/10 rounded px-2 pt-3 pb-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 transition-colors peer placeholder-transparent"
                  />
                  <label
                    htmlFor={`hotkey-${key}`}
                    className="absolute left-2 top-0.5 text-[10px] leading-relaxed text-white/70 transition-all 
                             peer-placeholder-shown:text-[11px] peer-placeholder-shown:text-white/50 peer-placeholder-shown:top-[7px]
                             peer-focus:top-0.5 peer-focus:text-[10px] peer-focus:text-white/70"
                  >
                    {label}
                  </label>
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="relative group">
                      <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4"/>
                          <path d="M12 8h.01"/>
                        </svg>
                      </div>
                      <div className="absolute bottom-full right-0 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg">
                          {description}
                          <div className="mt-1 text-white/50">Default: {defaultValue}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleHotkeyChange(key, defaultValue)}
                  className="text-white/50 hover:text-white/90 transition-colors select-none cursor-default px-1"
                >
                  ↺
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Privacy Section */}
      <div className="space-y-3">
        <h3 className="font-medium">Privacy</h3>
        <div className="px-2 space-y-4">
          {/* Content Protection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] leading-none text-white/90">Content Protection</h4>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg">
                    Disabling content protection will make the application visible in all screenshots and to all screensharing software.
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={handleContentProtectionToggle}
              disabled={isLocked}
              className={`w-full px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none ${
                isContentProtectionEnabled 
                  ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                  : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
              } ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isContentProtectionEnabled ? 'Content Protection Enabled' : 'Content Protection Disabled'}
            </button>
          </div>

          {/* Taskbar Icon */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="text-[11px] leading-none text-white/90">Taskbar Icon</h4>
              <div className="relative group">
                <div className="w-4 h-4 flex items-center justify-center text-white/50 hover:text-white/90 transition-colors cursor-default">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  <div className="bg-black/90 text-white/90 text-[10px] leading-relaxed p-2 rounded-md shadow-lg z-50">
                    If you are required to share your full screen during an interview we recommend hiding the taskbar icon.
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setIsTaskbarIconHidden(!isTaskbarIconHidden)}
                className={`px-3 py-1.5 text-[11px] leading-none rounded-md transition-colors select-none cursor-default flex items-center gap-2 ${
                  isTaskbarIconHidden 
                    ? 'bg-neutral-500/20 text-neutral-300 hover:bg-neutral-500/30' 
                    : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                }`}
              >
                <span className="flex-1">
                  {isTaskbarIconHidden ? 'Show Taskbar Icon' : 'Hide Taskbar Icon'}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3 h-3"
                >
                  {isTaskbarIconHidden ? (
                    <>
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" y1="2" x2="22" y2="22" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Appearance Section */}
      <div className="space-y-3">
        <h3 className="font-medium">Appearance</h3>
        <div className="px-2 space-y-4">
          <div className="space-y-2">
            <label className="text-[11px] leading-none text-white/90">Theme</label>
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
            <label className="text-[11px] leading-none text-white/90">Opacity</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neutral-400
                          [&::-webkit-slider-thumb]:hover:bg-neutral-300 [&::-webkit-slider-thumb]:transition-colors
                          [&::-webkit-slider-thumb]:border-none"
              />
              <span className="text-[11px] leading-none text-white/90 min-w-[2.5rem]">{Math.round(opacity * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="border-t border-white/10 pt-3 select-none space-y-3">
        <h3 className="font-medium">Preferences</h3>
        <div>
          <LanguageSelector
            currentLanguage={currentLanguage}
            setLanguage={setLanguage}
          />
          <ModelSelector
            currentModel={currentModel}
            setModel={setModel}
          />
          <VisionModelSelector
            currentModel={currentVisionModel}
            setModel={setCurrentVisionModel}
          />
        </div>
      </div>
    </div>
  )
} 