import React, { useEffect, useMemo, useState } from 'react'
import { CustomDropdown } from './CustomDropdown'
import { getSTTModels } from '../../lib/models'

// Define window global variables
declare global {
  interface Window {
    __STT_MODEL__: string;
    __LOCAL_WHISPER_AVAILABLE__?: boolean;
  }
}

interface STTModelOption {
  value: string
  label: string
}

interface STTModelGroup {
  label: string
  options: STTModelOption[]
}

interface STTModelSelectorProps {
  currentSTTModel: string
  setSTTModel: (model: string) => void
}

const RECOMMENDED_STT_MODELS = ['deepgram-nova-3', 'gpt-4o-transcribe', 'gpt-4o-mini-transcribe']
const LOCAL_WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large', 'turbo']

const STTModelSelector: React.FC<STTModelSelectorProps> = ({
  currentSTTModel,
  setSTTModel
}) => {
  const [isLocalWhisperAvailable, setIsLocalWhisperAvailable] = useState(false)

  // Check for local whisper CLI on component mount
  useEffect(() => {
    const checkWhisperAvailability = async () => {
      try {
        // Just checking if we're in Electron for now - could add actual CLI check later
        const isElectronAvailable = !!(window.electronAPI);
        console.log("Local Whisper availability check:", isElectronAvailable);
        
        // For now, we'll assume Whisper CLI is available if Electron is available
        // In a real implementation, we'd check if the whisper command exists
        setIsLocalWhisperAvailable(isElectronAvailable);
        window.__LOCAL_WHISPER_AVAILABLE__ = isElectronAvailable;
      } catch (error) {
        console.error("Error checking local Whisper availability:", error);
        setIsLocalWhisperAvailable(false);
      }
    };
    
    checkWhisperAvailability();
  }, []);

  useEffect(() => {
    // Initialize default STT model if not set
    if (!window.__STT_MODEL__) {
      window.__STT_MODEL__ = 'deepgram-nova-3'
      setSTTModel('deepgram-nova-3')
    }
  }, [])

  const handleSTTModelChange = (model: string) => {
    window.__STT_MODEL__ = model
    setSTTModel(model)
  }

  const sttModelOptions = useMemo(() => {
    // Debug logging
    console.debug('[STTModelSelector] Creating STT model options', { 
      isLocalWhisperAvailable, 
      currentSTTModel 
    })

    // Get all STT models from the centralized models.ts
    const allSTTModels = getSTTModels().map(model => ({
      id: model.id,
      name: model.name,
      provider: model.provider
    }))

    // Group models by provider
    let providerGroups: { [key: string]: STTModelOption[] } = {}
    
    // First add recommended models group
    providerGroups["recommended"] = RECOMMENDED_STT_MODELS
      .map(id => allSTTModels.find(m => m.id === id))
      .filter(Boolean)
      .map((model: any) => ({
        value: model.id,
        label: model.name
      }));
    
    // Then add remaining models by provider
    allSTTModels.forEach(model => {
      // Skip if it's already in recommended
      if (RECOMMENDED_STT_MODELS.includes(model.id)) return;
      
      if (!providerGroups[model.provider]) {
        providerGroups[model.provider] = []
      }
      
      providerGroups[model.provider].push({
        value: model.id,
        label: model.name
      })
    });

    // Add local whisper models if available
    if (isLocalWhisperAvailable) {
      console.log("Adding local Whisper models to dropdown");
      
      providerGroups["local"] = LOCAL_WHISPER_MODELS.map(modelName => ({
        value: `local:${modelName}`,
        label: `whisper-1 (${modelName})`
      }));
    }

    // Convert provider groups to the format expected by CustomDropdown
    const options: STTModelGroup[] = Object.entries(providerGroups)
      .filter(([_, models]) => models.length > 0)
      .map(([provider, models]) => ({
        label: provider.charAt(0).toUpperCase() + provider.slice(1),
        options: models
      }));
    
    // Ensure current model is in the options
    const allOptions = options.flatMap(group => group.options)
    const currentModelExists = allOptions.some(option => option.value === currentSTTModel)
    
    if (!currentModelExists && currentSTTModel) {
      // Add current model to options if it's not already there
      options.push({
        label: 'Current',
        options: [{ value: currentSTTModel, label: currentSTTModel }]
      })
    }

    return options
  }, [currentSTTModel, isLocalWhisperAvailable])

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">STT Model</span>
        <div className="flex items-center gap-2">
          {isLocalWhisperAvailable && (
            <div 
              className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 flex items-center gap-1"
              title={`${LOCAL_WHISPER_MODELS.length} local Whisper models available`}
            >
              <span>{LOCAL_WHISPER_MODELS.length}</span>
            </div>
          )}
          <CustomDropdown
            value={currentSTTModel}
            onChange={handleSTTModelChange}
            options={sttModelOptions}
            className="min-w-[160px]"
            placeholder="Select STT Model"
          />
        </div>
      </div>
    </div>
  )
}

export default STTModelSelector 