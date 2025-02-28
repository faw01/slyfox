import React, { useEffect } from "react"
import { models, visionModels as importedVisionModels } from "../../lib/models"
import { useToast } from "../../contexts/toast"

interface VisionModelSelectorProps {
  currentModel: string
  setModel: (model: string) => void
}

const RECOMMENDED_VISION_MODELS = [
  "gpt-4o", 
  "gpt-4o-mini"
]

// Debug log to check available vision models
console.log("===== VISION MODEL SELECTOR DEBUGGING =====")
console.log("Available vision models (imported):", importedVisionModels.length)
console.log("Google vision models (imported):", importedVisionModels.filter(m => m.provider === "google").map(m => m.id))
console.log("All models count:", models.length)
console.log("All models with vision:", models.filter(m => m.isVisionModel).length)
console.log("Recommended vision models:", RECOMMENDED_VISION_MODELS)
console.log("===== END VISION MODEL SELECTOR DEBUGGING =====")

export const VisionModelSelector: React.FC<VisionModelSelectorProps> = ({
  currentModel,
  setModel
}) => {
  const { showToast } = useToast()
  
  // Get only vision models
  const visionModels = models.filter(model => model.isVisionModel)
  
  // Enhanced debug log
  useEffect(() => {
    // Check specifically for Google and xAI models
    const googleVisionModels = visionModels.filter(m => m.provider === "google")
    const xaiVisionModels = visionModels.filter(m => m.provider === "xai")
    
    console.log("VisionModelSelector rendered with models:", {
      totalVisionModels: visionModels.length,
      googleVisionModels: googleVisionModels.length,
      googleVisionModelIds: googleVisionModels.map(m => m.id),
      xaiVisionModels: xaiVisionModels.length,
      xaiVisionModelIds: xaiVisionModels.map(m => m.id),
      allVisionModelsInComponent: visionModels.map(m => ({id: m.id, provider: m.provider})),
      currentModel
    })
  }, [currentModel, visionModels.length])

  // Force set the vision model to gpt-4o if it's not already set on initial mount
  useEffect(() => {
    if (!window.__VISION_MODEL__) {
      window.__VISION_MODEL__ = "gpt-4o"
      setModel("gpt-4o")
      
      // Find the model details and show the toast
      const selectedModel = models.find(m => m.id === "gpt-4o")
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
    
    const selectedModel = models.find(m => m.id === newModel)
    if (selectedModel) {
      showToast(
        "Vision Model Selected",
        selectedModel.name,
        "success"
      )
    }
  }

  // Debug information for rendering
  console.log("VisionModelSelector rendering with:", {
    recommendedVisionModelsForDisplay: visionModels.filter(model => RECOMMENDED_VISION_MODELS.includes(model.id)).map(m => m.id),
    otherVisionModelsForDisplay: visionModels.filter(model => !RECOMMENDED_VISION_MODELS.includes(model.id)).map(m => m.id),
    googleVisionModelsInDisplay: visionModels.filter(m => m.provider === "google").map(m => m.id),
    xaiVisionModelsInDisplay: visionModels.filter(m => m.provider === "xai").map(m => m.id)
  })

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-none text-white/90">Vision Model</span>
        <div className="flex items-center gap-2">
          <select
            value={currentModel}
            onChange={handleModelChange}
            className="bg-white/10 rounded px-2 py-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 min-w-[240px] w-full truncate"
          >
            <optgroup label="Recommended Vision Models">
              {visionModels
                .filter(model => RECOMMENDED_VISION_MODELS.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id} title={model.description}>
                    {`${model.provider === 'openai' ? 'OpenAI' : 
                       model.provider === 'anthropic' ? 'Anthropic' :
                       model.provider === 'google' ? 'Google' :
                       model.provider === 'xai' ? 'xAI' :
                       model.provider === 'meta' ? 'Meta' :
                       model.provider === 'alibaba' ? 'Alibaba' :
                       'DeepSeek'}: ${model.provider === 'deepseek' ? model.name.replace('DeepSeek ', '') : model.name}`}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Other Vision Models">
              {visionModels
                .filter(model => !RECOMMENDED_VISION_MODELS.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id} title={model.description}>
                    {`${model.provider === 'openai' ? 'OpenAI' : 
                       model.provider === 'anthropic' ? 'Anthropic' :
                       model.provider === 'google' ? 'Google' :
                       model.provider === 'xai' ? 'xAI' :
                       model.provider === 'meta' ? 'Meta' :
                       model.provider === 'alibaba' ? 'Alibaba' :
                       'DeepSeek'}: ${model.provider === 'deepseek' ? model.name.replace('DeepSeek ', '') : model.name}`}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
      </div>
    </div>
  )
}

export default VisionModelSelector 