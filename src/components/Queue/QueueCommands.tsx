import React, { useState, useEffect, useRef } from "react"

import { useToast } from "../../contexts/toast"
import { LanguageSelector } from "../shared/LanguageSelector"
import { ModelSelector } from "../shared/ModelSelector"
import { Settings } from "../shared/Settings"
import { COMMAND_KEY } from '../../utils/platform'
import STTPanel from "../shared/STTPanel"
import ChatPanel from "../shared/ChatPanel"

interface QueueCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  screenshotCount?: number
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  currentModel: string
  setModel: (model: string) => void
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  onTooltipVisibilityChange,
  screenshotCount = 0,
  credits,
  currentLanguage,
  setLanguage,
  currentModel,
  setModel
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [appVersion, setAppVersion] = useState("")
  const [electronVersion, setElectronVersion] = useState("")
  const [isSettingsLocked, setIsSettingsLocked] = useState(true)
  const [isSTTPanelOpen, setIsSTTPanelOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const [app, electron] = await Promise.all([
          window.electronAPI.getAppVersion(),
          window.electronAPI.getElectronVersion()
        ])
        setAppVersion(app)
        setElectronVersion(electron)
      } catch (error) {
        console.error('Failed to load versions:', error)
      }
    }
    loadVersions()
  }, [])

  useEffect(() => {
    let tooltipHeight = 0
    if (tooltipRef.current && isTooltipVisible) {
      tooltipHeight = tooltipRef.current.offsetHeight + 10
    }
    onTooltipVisibilityChange(isTooltipVisible, tooltipHeight)
  }, [isTooltipVisible])

  // Listen for toggle-stt-panel event from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onToggleSTTPanel(() => {
      setIsSTTPanelOpen(prev => !prev)
    })
    
    return () => {
      cleanup()
    }
  }, [])

  // Listen for toggle-chat event from main process when keyboard shortcut is used
  useEffect(() => {
    const handleToggleChat = () => {
      setIsChatOpen(prev => !prev)
    }
    
    // Once onToggleChat is properly implemented in ElectronAPI, uncomment this
    // const cleanup = window.electronAPI.onToggleChat(handleToggleChat)
    // return () => { cleanup() }
    
    // For now, implement a temporary keyboard shortcut handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        handleToggleChat()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if ((isSTTPanelOpen || isChatOpen) && isTooltipVisible) {
      setIsTooltipVisible(false)
    }
  }, [isSTTPanelOpen, isChatOpen])

  const handleToggleSettings = () => {
    setIsTooltipVisible(!isTooltipVisible)
  }

  const handleMouseEnter = () => {
    setIsTooltipVisible(true)
  }

  const handleMouseLeave = () => {
    setIsTooltipVisible(false)
  }

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          {/* Screenshot */}
          <div
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerScreenshot()
                if (!result.success) {
                  console.error("Failed to take screenshot:", result.error)
                  showToast("Error", "Failed to take screenshot", "error")
                }
              } catch (error) {
                console.error("Error taking screenshot:", error)
                showToast("Error", "Failed to take screenshot", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none truncate select-none cursor-default">
              Screenshot
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                H
              </button>
            </div>
          </div>

          {/* Solve Command */}
          {screenshotCount > 0 && (
            <div
              className={`flex flex-col rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default ${
                credits <= 0 ? "opacity-50" : ""
              }`}
              onClick={async () => {
                if (credits <= 0) {
                  showToast(
                    "Out of Credits",
                    "You are out of credits. Please refill at https://www.interviewcoder.co/settings.",
                    "error"
                  )
                  return
                }

                try {
                  const result =
                    await window.electronAPI.triggerProcessScreenshots()
                  if (!result.success) {
                    console.error(
                      "Failed to process screenshots:",
                      result.error
                    )
                    showToast("Error", "Failed to process screenshots", "error")
                  }
                } catch (error) {
                  console.error("Error processing screenshots:", error)
                  showToast("Error", "Failed to process screenshots", "error")
                }
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] leading-none select-none cursor-default">Solve </span>
                <div className="flex gap-1 ml-2">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                    {COMMAND_KEY}
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                    ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Teleprompter */}
          <div className="relative inline-block">
            <div 
              className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
              onClick={() => setIsSTTPanelOpen(!isSTTPanelOpen)}
            >
              <span className="text-[11px] leading-none truncate select-none cursor-default">
                Teleprompter
              </span>
              <div className="flex gap-1">
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                  {COMMAND_KEY}
                </button>
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                  T
                </button>
              </div>
            </div>
            
            {/* STT Panel */}
            {isSTTPanelOpen && (
              <STTPanel 
                isOpen={isSTTPanelOpen}
                onClose={() => setIsSTTPanelOpen(false)}
                currentSTTModel={window.__STT_MODEL__ || 'whisper-1'}
              />
            )}
          </div>

          {/* Chat */}
          <div className="relative inline-block">
            <div className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
              onClick={() => {
                // Add chat functionality here
                setIsChatOpen(!isChatOpen)
              }}
            >
              <span className="text-[11px] leading-none truncate select-none cursor-default">
                Chat
              </span>
              <div className="flex gap-1">
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                  {COMMAND_KEY}
                </button>
                <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                  D
                </button>
              </div>
            </div>
            
            {/* Chat Panel */}
            {isChatOpen && (
              <ChatPanel 
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
              />
            )}
          </div>

          {/* Settings with Tooltip */}
          <div className="relative inline-block">
            <div className="flex items-center gap-2">
              {/* Lock button */}
              {isTooltipVisible && (
                <button
                  onClick={() => setIsSettingsLocked(!isSettingsLocked)}
                  className={`p-1.5 rounded-md transition-colors select-none cursor-default ${
                    isSettingsLocked 
                      ? 'bg-neutral-500/20 text-neutral-300 hover:bg-neutral-500/30' 
                      : 'bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-3.5 h-3.5"
                  >
                    {isSettingsLocked ? (
                      <path d="M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C15.9474 10 16.5286 10 17 10.0288M7 10.0288C6.41168 10.0647 5.99429 10.1455 5.63803 10.327C5.07354 10.6146 4.6146 11.0735 4.32698 11.638C4 12.2798 4 13.1198 4 14.8V16.2C4 17.8802 4 18.7202 4.32698 19.362C4.6146 19.9265 5.07354 20.3854 5.63803 20.673C6.27976 21 7.11984 21 8.8 21H15.2C16.8802 21 17.7202 21 18.362 20.673C18.9265 20.3854 19.3854 19.9265 19.673 19.362C20 18.7202 20 17.8802 20 16.2V14.8C20 13.1198 20 12.2798 19.673 11.638C19.3854 11.0735 18.9265 10.6146 18.362 10.327C18.0057 10.1455 17.5883 10.0647 17 10.0288M7 10.0288V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V10.0288" />
                    ) : (
                      <path d="M16.584 6C15.8124 4.2341 14.0503 3 12 3C9.23858 3 7 5.23858 7 8V10.0288M12 14.5V16.5M7 10.0288C7.47142 10 8.05259 10 8.8 10H15.2C16.8802 10 17.7202 10 18.362 10.327C18.9265 10.6146 19.3854 11.0735 19.673 11.638C20 12.2798 20 13.1198 20 14.8V16.2C20 17.8802 20 18.7202 19.673 19.362C19.3854 19.9265 18.9265 20.3854 18.362 20.673C17.7202 21 16.8802 21 15.2 21H8.8C7.11984 21 6.27976 21 5.63803 20.673C5.07354 20.3854 4.6146 19.9265 4.32698 19.362C4 18.7202 4 17.8802 4 16.2V14.8C4 13.1198 4 12.2798 4.32698 11.638C4.6146 11.0735 5.07354 10.6146 5.63803 10.327C5.99429 10.1455 6.41168 10.0647 7 10.0288Z" />
                    )}
                  </svg>
                </button>
              )}
              {/* Gear icon */}
              <div 
                className="w-4 h-4 flex items-center justify-center text-white/70 hover:text-white/90 transition-colors"
                onClick={handleToggleSettings}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
            </div>

            {/* Tooltip Content */}
            {isTooltipVisible && (
              <div
                ref={tooltipRef}
                className="absolute top-full left-0 mt-[20px] w-80 transform -translate-x-[calc(50%-12px)]"
                style={{ zIndex: 100 }}
              >
                {/* Add transparent bridge */}
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate select-none cursor-default">Settings</h3>
                      <span className="text-[10px] leading-relaxed text-white/50 select-none cursor-default">
                        electron v{electronVersion} | client v{appVersion}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {/* Toggle Command */}
                      <div
                        className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.toggleMainWindow()
                            if (!result.success) {
                              console.error(
                                "Failed to toggle window:",
                                result.error
                              )
                              showToast(
                                "Error",
                                "Failed to toggle window",
                                "error"
                              )
                            }
                          } catch (error) {
                            console.error("Error toggling window:", error)
                            showToast(
                              "Error",
                              "Failed to toggle window",
                              "error"
                            )
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate select-none cursor-default">Toggle Window</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1 select-none cursor-default">
                          Show or hide this window.
                        </p>
                      </div>

                      {/* Screenshot Command */}
                      <div
                        className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.triggerScreenshot()
                            if (!result.success) {
                              console.error(
                                "Failed to take screenshot:",
                                result.error
                              )
                              showToast(
                                "Error",
                                "Failed to take screenshot",
                                "error"
                              )
                            }
                          } catch (error) {
                            console.error("Error taking screenshot:", error)
                            showToast(
                              "Error",
                              "Failed to take screenshot",
                              "error"
                            )
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate select-none cursor-default">Take Screenshot</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1 select-none cursor-default">
                          Take a screenshot of the problem description.
                        </p>
                      </div>

                      {/* Solve Command */}
                      <div
                        className={`rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                          screenshotCount > 0
                            ? ""
                            : "opacity-50"
                        } cursor-default`}
                        onClick={async () => {
                          if (screenshotCount === 0) return

                          try {
                            const result =
                              await window.electronAPI.triggerProcessScreenshots()
                            if (!result.success) {
                              console.error(
                                "Failed to process screenshots:",
                                result.error
                              )
                              showToast(
                                "Error",
                                "Failed to process screenshots",
                                "error"
                              )
                            }
                          } catch (error) {
                            console.error(
                              "Error processing screenshots:",
                              error
                            )
                            showToast(
                              "Error",
                              "Failed to process screenshots",
                              "error"
                            )
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate select-none cursor-default">Solve</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1 select-none cursor-default">
                          {screenshotCount > 0
                            ? "Generate a solution based on the current problem."
                            : "Take a screenshot first to generate a solution."}
                        </p>
                      </div>
                    </div>

                    {/* Separator and Settings */}
                    <div className="pt-3 mt-3 border-t border-white/10">
                      <Settings
                        currentLanguage={currentLanguage}
                        setLanguage={setLanguage}
                        currentModel={currentModel}
                        setModel={setModel}
                        isLocked={isSettingsLocked}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QueueCommands
