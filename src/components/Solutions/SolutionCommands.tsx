import React, { useState, useEffect, useRef } from "react"
import { useToast } from "../../contexts/toast"
import { Screenshot } from "../../types/screenshots"
import { LanguageSelector } from "../shared/LanguageSelector"
import { ModelSelector } from "../shared/ModelSelector"
import { Settings } from "../shared/Settings"
import { COMMAND_KEY } from '../../utils/platform'
import STTPanel from "../shared/STTPanel"

export interface SolutionCommandsProps {
  onTooltipVisibilityChange: (visible: boolean, height: number) => void
  isProcessing: boolean
  screenshots?: Screenshot[]
  extraScreenshots?: Screenshot[]
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  currentModel: string
  setModel: (model: string) => void
}

const SolutionCommands: React.FC<SolutionCommandsProps> = ({
  onTooltipVisibilityChange,
  isProcessing,
  extraScreenshots = [],
  credits,
  currentLanguage,
  setLanguage,
  currentModel,
  setModel
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [isSTTPanelOpen, setIsSTTPanelOpen] = useState(false)
  const [isSettingsLocked, setIsSettingsLocked] = useState(true)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()

  const handleResetApiKey = async () => {
    try {
      const result = await window.electronAPI.clearStore()
      if (result.success) {
        window.location.reload()
      } else {
        showToast("Error", "Failed to reset API key", "error")
      }
    } catch (error) {
      showToast("Error", "Failed to reset API key", "error")
    }
  }

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

  useEffect(() => {
    if (isSTTPanelOpen && isTooltipVisible) {
      setIsTooltipVisible(false)
    }
  }, [isSTTPanelOpen])

  const handleToggleSettings = () => {
    setIsTooltipVisible(!isTooltipVisible)
  }

  return (
    <div>
      <div className="pt-2 w-fit">
        <div className="text-xs text-white/90 backdrop-blur-md bg-black/60 rounded-lg py-2 px-4 flex items-center justify-center gap-4">
          {/* Show/Hide - Always visible */}
          <div
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
            onClick={async () => {
              try {
                const result = await window.electronAPI.toggleMainWindow()
                if (!result.success) {
                  console.error("Failed to toggle window:", result.error)
                  showToast("Error", "Failed to toggle window", "error")
                }
              } catch (error) {
                console.error("Error toggling window:", error)
                showToast("Error", "Failed to toggle window", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none select-none cursor-default">Show/Hide</span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                B
              </button>
            </div>
          </div>

          {/* Screenshot and Debug commands - Only show if not processing */}
          {!isProcessing && (
            <>
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
                  {extraScreenshots.length === 0
                    ? "Screenshot again"
                    : "Screenshot"}
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

              {extraScreenshots.length > 0 && (
                <div
                  className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
                  onClick={async () => {
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
                      console.error("Error processing screenshots:", error)
                      showToast(
                        "Error",
                        "Failed to process screenshots",
                        "error"
                      )
                    }
                  }}
                >
                  <span className="text-[11px] leading-none select-none cursor-default">Debug</span>
                  <div className="flex gap-1">
                    <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                      {COMMAND_KEY}
                    </button>
                    <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                      ↵
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Start Over - Always visible */}
          <div
            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
            onClick={async () => {
              try {
                const result = await window.electronAPI.triggerReset()
                if (!result.success) {
                  console.error("Failed to reset:", result.error)
                  showToast("Error", "Failed to reset", "error")
                }
              } catch (error) {
                console.error("Error resetting:", error)
                showToast("Error", "Failed to reset", "error")
              }
            }}
          >
            <span className="text-[11px] leading-none select-none cursor-default">Start Over</span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                {COMMAND_KEY}
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                R
              </button>
            </div>
          </div>

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

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

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

          {/* Settings with Tooltip */}
          <div className="relative inline-block">
            {/* Gear icon */}
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
                className="absolute top-full right-0 mt-[20px] w-80"
                style={{ zIndex: 100 }}
              >
                {/* Add transparent bridge */}
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <h3 className="font-medium whitespace-nowrap">
                      Settings
                    </h3>
                    <div className="space-y-3">
                      {/* Show/Hide - Always visible */}
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

                      {/* Screenshot and Debug commands - Only show if not processing */}
                      {!isProcessing && (
                        <>
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
                              Capture additional parts of the question or your
                              solution for debugging help.
                            </p>
                          </div>

                          {extraScreenshots.length > 0 && (
                            <div
                              className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
                              onClick={async () => {
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
                                <span className="truncate select-none cursor-default">Debug</span>
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
                                Generate new solutions based on all previous and
                                newly added screenshots.
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Start Over - Always visible */}
                      <div
                        className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors cursor-default"
                        onClick={async () => {
                          try {
                            const result =
                              await window.electronAPI.triggerReset()
                            if (!result.success) {
                              console.error("Failed to reset:", result.error)
                              showToast("Error", "Failed to reset", "error")
                            }
                          } catch (error) {
                            console.error("Error resetting:", error)
                            showToast("Error", "Failed to reset", "error")
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate select-none cursor-default">Start Over</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              {COMMAND_KEY}
                            </span>
                            <span className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 select-none cursor-default">
                              R
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1 select-none cursor-default">
                          Discard all progress and go back to the problem description.
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

export default SolutionCommands
