import React, { useEffect } from "react"
import { visionModels } from "../../lib/models"
import { useToast } from "../../contexts/toast"

interface VisionModelSelectorProps {
  currentModel: string
  setModel: (model: string) => void
}

export const VisionModelSelector: React.FC<VisionModelSelectorProps> = ({
  currentModel,
  setModel
}) => {
  const { showToast } = useToast()

  // Force set the vision model to gpt-4o-mini if it's not already set on initial mount
  useEffect(() => {
    if (!window.__VISION_MODEL__) {
      window.__VISION_MODEL__ = "gpt-4o-mini"
      setModel("gpt-4o-mini")
      
      // Find the model details and show the toast
      const selectedModel = visionModels.find(m => m.id === "gpt-4o-mini")
      if (selectedModel) {
        showToast(
          "Vision Model Selected",
          selectedModel.name,
          "success"
        )
      }
    }
  }, [])

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value
    window.__VISION_MODEL__ = newModel
    setModel(newModel)
    
    const selectedModel = visionModels.find(m => m.id === newModel)
    if (selectedModel) {
      showToast(
        "Vision Model Selected",
        selectedModel.name,
        "success"
      )
    }
  }

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">Vision Model</span>
        <select
          value={currentModel}
          onChange={handleModelChange}
          className="bg-white/10 rounded px-2 py-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 min-w-[120px]"
        >
          {visionModels.map((model) => (
            <option key={model.id} value={model.id} title={model.description}>
              {model.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default VisionModelSelector 