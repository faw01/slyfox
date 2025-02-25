// Debug.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query"
import React, { useEffect, useRef, useState } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import SolutionCommands from "../components/Solutions/SolutionCommands"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastTitle,
  ToastVariant
} from "../components/ui/toast"
import { Screenshot } from "../types/screenshots"
import { ComplexitySection, ContentSection } from "./Solutions"
import { useToast } from "../contexts/toast"

const CodeSection = ({
  title,
  content,
  isLoading,
  currentLanguage
}: {
  title: string
  content: string | null
  isLoading: boolean
  currentLanguage: string
}) => (
  <div className="space-y-2">
    <h3 className="text-xs font-medium text-white/90">{title}</h3>
    {isLoading ? (
      <div className="h-32 bg-black/50 animate-pulse rounded" />
    ) : (
      <div className="rounded overflow-hidden">
        <SyntaxHighlighter
          language={currentLanguage.toLowerCase()}
          style={dracula}
          customStyle={{
            margin: 0,
            padding: "0.75rem",
            fontSize: "0.75rem",
            lineHeight: "1rem",
            background: "rgba(0, 0, 0, 0.5)"
          }}
        >
          {content || ""}
        </SyntaxHighlighter>
      </div>
    )}
  </div>
)

async function fetchScreenshots(): Promise<Screenshot[]> {
  try {
    const existing = await window.electronAPI.getScreenshots()
    console.log("Raw screenshot data in Debug:", existing)
    return (Array.isArray(existing) ? existing : []).map((p) => ({
      id: p.path,
      path: p.path,
      preview: p.preview,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error("Error loading screenshots:", error)
    throw error
  }
}

interface DebugProps {
  setView: (view: "queue" | "solutions" | "debug") => void
  credits: number
  currentLanguage: string
  setLanguage: (language: string) => void
  currentModel: string
  setModel: (model: string) => void
}

const Debug: React.FC<DebugProps> = ({
  setView,
  credits,
  currentLanguage,
  setLanguage,
  currentModel,
  setModel
}) => {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipHeight, setTooltipHeight] = useState(0)
  const { showToast } = useToast()

  const { data: screenshots = [], refetch } = useQuery<Screenshot[]>({
    queryKey: ["screenshots"],
    queryFn: fetchScreenshots,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false
  })

  const [oldCode, setOldCode] = useState<string | null>(null)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [thoughtsData, setThoughtsData] = useState<string[] | null>(null)
  const [timeComplexityData, setTimeComplexityData] = useState<string | null>(null)
  const [spaceComplexityData, setSpaceComplexityData] = useState<string | null>(null)

  const queryClient = useQueryClient()
  const contentRef = useRef<HTMLDivElement>(null)

  const handleDeleteExtraScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete extra screenshot:", response.error)
      }
    } catch (error) {
      console.error("Error deleting extra screenshot:", error)
    }
  }

  useEffect(() => {
    // Try to get the new solution data from cache first
    const newSolution = queryClient.getQueryData(["new_solution"]) as {
      thoughts: string[]
      old_code: string
      new_code: string
      time_complexity: string
      space_complexity: string
    }

    if (newSolution) {
      setThoughtsData(newSolution.thoughts)
      setOldCode(newSolution.old_code)
      setNewCode(newSolution.new_code)
      setTimeComplexityData(newSolution.time_complexity)
      setSpaceComplexityData(newSolution.space_complexity)
    }

    // Set up event listeners
    const cleanupFunctions = [
      window.electronAPI.onDebugSuccess((data) => {
        setThoughtsData(data.thoughts)
        setOldCode(data.old_code)
        setNewCode(data.new_code)
        setTimeComplexityData(data.time_complexity)
        setSpaceComplexityData(data.space_complexity)
        queryClient.setQueryData(["new_solution"], data)
      }),
      window.electronAPI.onDebugError((error) => {
        showToast("Error", error, "error")
        setView("solutions")
      })
    ]

    return () => cleanupFunctions.forEach((fn) => fn())
  }, [])

  useEffect(() => {
    const updateDimensions = () => {
      if (contentRef.current) {
        let contentHeight = contentRef.current.scrollHeight
        const contentWidth = contentRef.current.scrollWidth
        if (tooltipVisible) {
          contentHeight += tooltipHeight
        }
        window.electronAPI.updateContentDimensions({
          width: contentWidth,
          height: contentHeight
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current)
    }
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
    }
  }, [tooltipVisible, tooltipHeight])

  const handleTooltipVisibilityChange = (visible: boolean, height: number) => {
    setTooltipVisible(visible)
    setTooltipHeight(height)
  }

  return (
    <div ref={contentRef} className="relative space-y-3 px-4 py-3">
      {/* Conditionally render the screenshot queue */}
      <div className="bg-transparent w-fit">
        <div className="pb-3">
          <ScreenshotQueue
            isLoading={false}
            screenshots={screenshots}
            onDeleteScreenshot={handleDeleteExtraScreenshot}
          />
        </div>

        <SolutionCommands
          onTooltipVisibilityChange={handleTooltipVisibilityChange}
          isProcessing={false}
          extraScreenshots={screenshots}
          credits={credits}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
          currentModel={currentModel}
          setModel={setModel}
        />
      </div>

      {/* Code comparison sections */}
      <div className="space-y-4">
        <ContentSection
          title="My Thoughts"
          content={
            thoughtsData && (
              <div className="space-y-3">
                <div className="space-y-1">
                  {thoughtsData.map((thought, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-400/80 mt-2 shrink-0" />
                      <div>{thought}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
          isLoading={!thoughtsData}
        />

        <CodeSection
          title="Original Code"
          content={oldCode}
          isLoading={!oldCode}
          currentLanguage={currentLanguage}
        />

        <CodeSection
          title="Improved Code"
          content={newCode}
          isLoading={!newCode}
          currentLanguage={currentLanguage}
        />

        <ComplexitySection
          timeComplexity={timeComplexityData}
          spaceComplexity={spaceComplexityData}
          isLoading={!timeComplexityData || !spaceComplexityData}
        />
      </div>
    </div>
  )
}

export default Debug
