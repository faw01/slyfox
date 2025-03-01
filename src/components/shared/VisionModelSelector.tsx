import React, { useEffect, useMemo, useState } from "react"
import { models, visionModels as importedVisionModels } from "../../lib/models"
import { useToast } from "../../contexts/toast"
import { CustomDropdown } from "./CustomDropdown"
import { checkOllamaHealth, getLocalModels } from "../../lib/ollama-client"

interface Option {
  value: string;
  label: string;
  title?: string;
}

interface VisionModelSelectorProps {
  currentVisionModel: string
  setCurrentVisionModel: (visionModel: string) => void
}

const RECOMMENDED_VISION_MODELS = [
  "gpt-4o", 
  "gpt-4o-mini"
]

// Debug log to check available vision models
console.log("===== VISION MODEL SELECTOR DEBUGGING =====")
console.log("Available models in VisionModelSelector:", models.length)
console.log("Vision models in VisionModelSelector:", models.filter(m => m.isVisionModel).map(m => m.id))
console.log("Recommended vision models:", RECOMMENDED_VISION_MODELS)
console.log("===== END VISION MODEL SELECTOR DEBUGGING =====")

// Define window global variable
declare global {
  interface Window {
    __VISION_MODEL__: string;
  }
}

export const VisionModelSelector: React.FC<VisionModelSelectorProps> = ({
  currentVisionModel,
  setCurrentVisionModel
}) => {
  const { showToast } = useToast()
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false)
  const [localModels, setLocalModels] = useState<any[]>([])
  
  // Debug log inside component
  useEffect(() => {
    console.log("VisionModelSelector rendered with models:", {
      totalModels: models.length,
      visionModels: models.filter(m => m.isVisionModel).length,
      visionModelIds: models.filter(m => m.isVisionModel).map(m => m.id),
      currentVisionModel,
      localModelsState: localModels?.length,
      isOllamaAvailableState: isOllamaAvailable
    })
  }, [currentVisionModel, localModels, isOllamaAvailable])

  // Check Ollama availability and get local models
  useEffect(() => {
    const checkOllama = async () => {
      try {
        console.log("VisionModelSelector: Checking Ollama health...");
        const available = await checkOllamaHealth()
        console.log("VisionModelSelector: Ollama health check result:", available);
        setIsOllamaAvailable(available)
        
        if (available) {
          console.log("VisionModelSelector: Fetching local models from Ollama...");
          const ollamaModels = await getLocalModels()
          console.log("VisionModelSelector: Fetched local models:", ollamaModels);
          setLocalModels(ollamaModels)
        }
      } catch (error) {
        console.error("VisionModelSelector: Error checking Ollama:", error)
        setIsOllamaAvailable(false)
      }
    }
    
    checkOllama()
  }, [])

  // Set default vision model to gpt-4o if no model set
  useEffect(() => {
    if (!currentVisionModel) {
      const defaultModel = "gpt-4o"
      setCurrentVisionModel(defaultModel)
      
      // Find the model details and show the toast
      const selectedModel = models.find(m => m.id === defaultModel)
      if (selectedModel) {
        showToast(
          "Vision Model Selected",
          selectedModel.name,
          "success"
        )
      }
    }
  }, [])

  const handleVisionModelChange = (newModel: string) => {
    setCurrentVisionModel(newModel)
    // Update electron preference if available
    window.electronAPI?.setModel?.(newModel).catch(console.error)
    
    // Check if it's a local model
    const isLocalModel = localModels.some(m => m.id === newModel || m.name === newModel)
    
    // Find the model details and show the toast
    const selectedModel = isLocalModel 
      ? localModels.find(m => m.id === newModel || m.name === newModel)
      : models.find(m => m.id === newModel)
      
    if (selectedModel) {
      showToast(
        "Vision Model Selected",
        `${selectedModel.name}${isLocalModel ? ' (Local)' : ''}`,
        "success"
      )
    }
  }

  const visionModelOptions = useMemo(() => {
    // Additional debug logging for local models
    console.log("VisionModelSelector: modelOptions calculation with:", {
      localModelsAvailable: localModels?.length || 0,
      ollamaAvailable: isOllamaAvailable
    });
    
    // Get only vision models from supported list
    const visionModels = models.filter((model) => 
      model.isVisionModel || 
      RECOMMENDED_VISION_MODELS.includes(model.id)
    )
    
    // Group by provider
    const providerGroups: { [key: string]: Option[] } = {}
    
    // First add recommended models group
    providerGroups["recommended"] = RECOMMENDED_VISION_MODELS
      .map(id => models.find(m => m.id === id))
      .filter(Boolean)
      .map((model: any) => ({
        value: model.id,
        label: model.name,
        title: model.description
      }))
    
    // Then add the rest by provider
    visionModels.forEach(model => {
      // Skip if it's already in recommended
      if (RECOMMENDED_VISION_MODELS.includes(model.id)) return
      
      if (!providerGroups[model.provider]) {
        providerGroups[model.provider] = []
      }
      
      providerGroups[model.provider].push({
        value: model.id,
        label: model.name,
        title: model.description
      })
    })
    
    // Add Ollama models that support vision
    if (isOllamaAvailable && localModels?.length > 0) {
      // Log that we're adding local models
      console.log("VisionModelSelector: Checking for vision-capable local models");
      
      // Filter to local models that support vision (for now just assume they do)
      const visionCapableLocalModels = localModels.filter(model => 
        model.name.includes("llava") || // LLaVA models support vision
        model.name.includes("bakllava") // Some other vision models
      )
      
      console.log("VisionModelSelector: Found vision-capable local models:", visionCapableLocalModels.length);
      
      if (visionCapableLocalModels.length > 0) {
        providerGroups["local"] = visionCapableLocalModels.map(model => ({
          value: model.name,
          label: model.name,
          title: `Local Vision Model - ${model.modified || 'Unknown date'}`
        }))
      }
    } else {
      console.log("VisionModelSelector: Not adding local models because:", { 
        isOllamaAvailable, 
        localModelsLength: localModels?.length 
      });
    }
    
    // Make sure the current model is included in the options
    if (currentVisionModel) {
      // Check if it's already in any group
      const isIncluded = Object.values(providerGroups)
        .flat()
        .some(option => option.value === currentVisionModel)
        
      if (!isIncluded) {
        // First check if it's a local model
        const localModel = localModels.find(m => m.name === currentVisionModel)
        if (localModel) {
          if (!providerGroups["local"]) {
            providerGroups["local"] = []
          }
          if (!providerGroups["local"].some(o => o.value === currentVisionModel)) {
            providerGroups["local"].push({
              value: localModel.name,
              label: localModel.name,
              title: `Local Vision Model`
            })
          }
        } else {
          // Otherwise check the regular models
          const currentModelObj = models.find(m => m.id === currentVisionModel)
          if (currentModelObj) {
            const provider = currentModelObj.provider
            if (!providerGroups[provider]) {
              providerGroups[provider] = []
            }
            providerGroups[provider].push({
              value: currentModelObj.id,
              label: currentModelObj.name,
              title: currentModelObj.description
            })
          }
        }
      }
    }

    // Debug what's actually being used in render
    console.log("VisionModelSelector rendering with:", {
      recommendedModelsForDisplay: visionModels.filter(model => RECOMMENDED_VISION_MODELS.includes(model.id)).map(m => m.id),
      otherModelsForDisplay: visionModels.filter(model => !RECOMMENDED_VISION_MODELS.includes(model.id)).map(m => m.id),
      localVisionModelsCount: providerGroups["local"]?.length || 0,
      ollamaAvailable: isOllamaAvailable,
      allProviderGroups: Object.keys(providerGroups)
    })

    // Convert to the format expected by CustomDropdown
    return Object.entries(providerGroups).map(([provider, options]) => {
      // Convert provider name for display
      let displayName = provider.charAt(0).toUpperCase() + provider.slice(1)
      
      // Special case for provider names
      if (provider === "recommended") displayName = "Recommended Models"
      else if (provider === "openai") displayName = "OpenAI"
      else if (provider === "anthropic") displayName = "Anthropic"
      else if (provider === "google") displayName = "Google"
      else if (provider === "local") displayName = "Local Vision Models"
      
      return {
        label: displayName,
        options: options.sort((a, b) => a.label.localeCompare(b.label))
      }
    }).filter(group => group.options.length > 0)
  }, [models, currentVisionModel, localModels, isOllamaAvailable])

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">Vision Model</span>
        <div className="flex items-center gap-2">
          {isOllamaAvailable && localModels?.filter(m => 
            m.name.includes("llava") || m.name.includes("bakllava")
          ).length > 0 && (
            <div 
              className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 flex items-center gap-1"
              title="Local vision models available"
            >
              <span>🖥️</span>
              <span>Vision</span>
            </div>
          )}
          <CustomDropdown
            value={currentVisionModel}
            onChange={handleVisionModelChange}
            options={visionModelOptions}
            className="min-w-[160px]"
            placeholder="Select a vision model"
          />
        </div>
      </div>
    </div>
  )
}

export default VisionModelSelector 