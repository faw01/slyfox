import React, { useState, useEffect, useRef } from "react"

import { useToast } from "../../contexts/toast"
import { LanguageSelector } from "../shared/LanguageSelector"
import { ModelSelector } from "../shared/ModelSelector"
import { Settings } from "../shared/Settings"

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
            <span className="text-[11px] leading-none truncate cursor-default">
              Screenshot
            </span>
            <div className="flex gap-1">
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 cursor-default">
                ⌘
              </button>
              <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 cursor-default">
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
                <span className="text-[11px] leading-none cursor-default">Solve </span>
                <div className="flex gap-1 ml-2">
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 cursor-default">
                    ⌘
                  </button>
                  <button className="bg-white/10 rounded-md px-1.5 py-1 text-[11px] leading-none text-white/70 cursor-default">
                    ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Separator */}
          <div className="mx-2 h-4 w-px bg-white/20" />

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
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </>
                    ) : (
                      <>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        <line x1="12" y1="14" x2="12" y2="18" />
                      </>
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
                className="absolute top-full left-0 mt-2 w-80 transform -translate-x-[calc(50%-12px)]"
                style={{ zIndex: 100 }}
              >
                {/* Add transparent bridge */}
                <div className="absolute -top-2 right-0 w-full h-2" />
                <div className="p-3 text-xs bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-white/90 shadow-lg">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium truncate">Keyboard Shortcuts</h3>
                      <span className="text-[10px] leading-relaxed text-white/50">
                        electron v{electronVersion} | client v{appVersion}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {/* Toggle Command */}
                      <div
                        className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
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
                          <span className="truncate">Toggle Window</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              B
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Show or hide this window.
                        </p>
                      </div>

                      {/* Screenshot Command */}
                      <div
                        className="rounded px-2 py-1.5 hover:bg-white/10 transition-colors"
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
                          <span className="truncate">Take Screenshot</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              H
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
                          Take a screenshot of the problem description.
                        </p>
                      </div>

                      {/* Solve Command */}
                      <div
                        className={`rounded px-2 py-1.5 hover:bg-white/10 transition-colors ${
                          screenshotCount > 0
                            ? ""
                            : "opacity-50"
                        }`}
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
                          <span className="truncate">Solve</span>
                          <div className="flex gap-1 flex-shrink-0">
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ⌘
                            </span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] leading-none">
                              ↵
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-relaxed text-white/70 truncate mt-1">
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
