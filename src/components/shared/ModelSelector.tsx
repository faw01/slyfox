import React, { useEffect, useState } from "react"
import { models, visionModels } from "../../lib/models"
import { useToast } from "../../contexts/toast"
import { checkOllamaHealth, getLocalModels } from "../../lib/ollama-client"

interface ModelSelectorProps {
  currentModel: string
  setModel: (model: string) => void
}

const RECOMMENDED_MODELS = ["o3-mini-high", "o1-mini", "claude-3-5-sonnet-latest", "gpt-4o"]

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  setModel
}) => {
  const { showToast } = useToast()
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false)
  const [localModels, setLocalModels] = useState<any[]>([])

  // Check Ollama availability and get local models
  useEffect(() => {
    const checkOllama = async () => {
      const available = await checkOllamaHealth()
      setIsOllamaAvailable(available)
      if (available) {
        const models = await getLocalModels()
        setLocalModels(models)
      }
    }
    checkOllama()
  }, [])

  // Force set the model to gpt-4o if it's not already set on initial mount
  useEffect(() => {
    if (!window.__MODEL__) {
      window.__MODEL__ = "gpt-4o"
      setModel("gpt-4o")
      window.electronAPI.setModel("gpt-4o").catch(console.error)
      
      // Find the model details and show the toast
      const selectedModel = [...models, ...visionModels].find(m => m.id === "gpt-4o")
      if (selectedModel) {
        showToast(
          "Model Selected",
          selectedModel.name,
          "success"
        )
      }
    }
  }, [])

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value
    window.__MODEL__ = newModel
    setModel(newModel)
    await window.electronAPI.setModel(newModel)
    
    // Check if it's a local model
    const isLocalModel = localModels.some(m => m.name === newModel)
    
    // Check both regular and vision models
    const selectedModel = [...models, ...visionModels].find(m => m.id === newModel)
    if (selectedModel) {
      showToast(
        "Model Selected",
        `${selectedModel.name}${isLocalModel ? ' (Local)' : ''}`,
        "success"
      )
    }
  }

  // Show all available models
  const allModels = [...models, ...visionModels]

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-none text-white/90">Model</span>
        <div className="flex items-center gap-2">
          <select
            value={currentModel}
            onChange={handleModelChange}
            className="bg-white/10 rounded px-2 py-1 text-[11px] leading-none outline-none border border-white/10 focus:border-white/20 min-w-[120px]"
          >
            <optgroup label="Recommended Models">
              {allModels
                .filter(model => RECOMMENDED_MODELS.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id} title={model.description}>
                    {`${model.provider === 'openai' ? 'OpenAI' : 
                       model.provider === 'anthropic' ? 'Anthropic' :
                       model.provider === 'google' ? 'Google' :
                       'DeepSeek'}: ${model.provider === 'deepseek' ? model.name.replace('DeepSeek ', '') : model.name}`}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Other Models">
              {allModels
                .filter(model => !RECOMMENDED_MODELS.includes(model.id))
                .map((model) => (
                  <option key={model.id} value={model.id} title={model.description}>
                    {`${model.provider === 'openai' ? 'OpenAI' : 
                       model.provider === 'anthropic' ? 'Anthropic' :
                       model.provider === 'google' ? 'Google' :
                       'DeepSeek'}: ${model.provider === 'deepseek' ? model.name.replace('DeepSeek ', '') : model.name}`}
                  </option>
                ))}
            </optgroup>
            {isOllamaAvailable && localModels.length > 0 && (
              <optgroup label="Local Models">
                {localModels.map((model) => (
                  <option key={model.name} value={model.name} title="Local Ollama Model">
                    {`Local: ${model.name}`}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {isOllamaAvailable && (
            <div 
              className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 flex items-center gap-1"
              title={`${localModels.length} local models available`}
            >
              <span>🖥️</span>
              <span>{localModels.length}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 