import React, { useEffect, useMemo, useState } from "react"
import { models } from "../../lib/models"
import { CustomDropdown } from "./CustomDropdown"
import { checkOllamaHealth, getLocalModels } from "../../lib/ollama-client"

// Define window global variables
declare global {
  interface Window {
    __TELEPROMPTER_MODEL__: string;
    __LOCAL_MODELS__?: any[];
  }
}

interface Option {
  value: string;
  label: string;
  title?: string;
}

interface TeleprompterModelSelectorProps {
  currentTeleprompterModel: string;
  setTeleprompterModel: (model: string) => void;
  showLocalModels?: boolean;
}

// Define supported providers with local models
const providersWithLocalModels = ["openai", "anthropic", "google"];

// Define recommended models
const RECOMMENDED_MODELS = ["gpt-4o", "o3-mini-high", "gemini-2.5-pro-preview", "gemini-2.0-flash", "claude-3-7-sonnet-thinking-high"];

// Debug log to check available models
console.log("===== TELEPROMPTER MODEL SELECTOR DEBUGGING =====");
console.log("Available models in TeleprompterModelSelector:", models.length);
console.log("Google models in TeleprompterModelSelector:", models.filter(m => m.provider === "google").map(m => m.id));
console.log("Recommended models:", RECOMMENDED_MODELS);
console.log("===== END TELEPROMPTER MODEL SELECTOR DEBUGGING =====");

// Modify provider display name
const getProviderDisplayName = (provider: string) => {
  let displayName = provider.charAt(0).toUpperCase() + provider.slice(1);
  if (provider === "openai") displayName = "OpenAI"
  else if (provider === "anthropic") displayName = "Anthropic"
  else if (provider === "google") displayName = "Google"
  else if (provider === "deepseek") displayName = "DeepSeek"
  else if (provider === "meta") displayName = "Meta"
  else if (provider === "deepgram") displayName = "Deepgram"
  else if (provider === "recommended") displayName = "Recommended Models"
  else if (provider === "local") displayName = "Local Models"
  return displayName;
}

export const TeleprompterModelSelector: React.FC<TeleprompterModelSelectorProps> = ({
  currentTeleprompterModel,
  setTeleprompterModel,
  showLocalModels = true
}) => {
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>([]);

  // Debug log inside component
  useEffect(() => {
    console.log("TeleprompterModelSelector rendered with models:", {
      totalModels: models.length,
      googleModels: models.filter(m => m.provider === "google").length,
      googleModelIds: models.filter(m => m.provider === "google").map(m => m.id),
      currentTeleprompterModel,
      localModelsState: localModels?.length,
      isOllamaAvailableState: isOllamaAvailable
    });
  }, [currentTeleprompterModel, localModels, isOllamaAvailable]);

  // Check Ollama availability and get local models
  useEffect(() => {
    const checkOllama = async () => {
      try {
        console.log("Checking Ollama health...");
        const available = await checkOllamaHealth();
        console.log("Ollama health check result:", available);
        setIsOllamaAvailable(available);
        
        if (available) {
          console.log("Fetching local models from Ollama...");
          const ollamaModels = await getLocalModels();
          console.log("Fetched local models:", ollamaModels);
          setLocalModels(ollamaModels);
          // Set global local models reference
          window.__LOCAL_MODELS__ = ollamaModels;
        }
      } catch (error) {
        console.error("Error checking Ollama:", error);
        setIsOllamaAvailable(false);
      }
    };
    
    checkOllama();
  }, []);

  // Initialize default model if not set
  useEffect(() => {
    if (!window.__TELEPROMPTER_MODEL__) {
      window.__TELEPROMPTER_MODEL__ = "gpt-4o"
      setTeleprompterModel("gpt-4o")
    }
  }, [])

  const handleModelChange = (newModel: string) => {
    window.__TELEPROMPTER_MODEL__ = newModel;
    setTeleprompterModel(newModel);
    
    // Check if it's a local model
    const isLocalModel = localModels.some(m => m.id === newModel || m.name === newModel);
  }

  // Filter out vision models that are not recommended
  const nonVisionModels = models.filter(model => 
    !model.isVisionModel || 
    RECOMMENDED_MODELS.includes(model.id) || 
    model.id === "o1" ||
    model.provider === "google" // Include all Google models regardless of vision flag
  );

  const teleprompterModelOptions = useMemo(() => {
    // Additional debug logging for local models
    console.log("teleprompterModelOptions calculation with:", {
      localModelsAvailable: localModels?.length || 0,
      ollamaAvailable: isOllamaAvailable,
      showLocalModels: showLocalModels
    });
    
    // Group models by provider
    let providerGroups: { [key: string]: Option[] } = {}
    
    // First add recommended models group
    providerGroups["recommended"] = RECOMMENDED_MODELS
      .map(id => nonVisionModels.find(m => m.id === id))
      .filter(Boolean)
      .map((model: any) => ({
        value: model.id,
        label: model.name,
        title: model.description
      }));
    
    // Then add remaining models by provider
    nonVisionModels.forEach(model => {
      // Skip if it's already in recommended
      if (RECOMMENDED_MODELS.includes(model.id)) return;
      
      // Skip vision models that aren't explicitly included
      if (model.isVisionModel && 
          !RECOMMENDED_MODELS.includes(model.id) && 
          model.provider !== "google") return;
      
      if (!providerGroups[model.provider]) {
        providerGroups[model.provider] = []
      }
      
      providerGroups[model.provider].push({
        value: model.id,
        label: model.name,
        title: model.description
      })
    });
    
    // Add local models if enabled and available
    if (showLocalModels && isOllamaAvailable && localModels?.length > 0) {
      // Log that we're adding local models
      console.log("Adding local models to dropdown:", localModels.length);
      
      // Create the local models group
      providerGroups["local"] = localModels.map(model => ({
        value: model.name, // Use model name as the value for local models
        label: model.name,
        title: `Local Ollama Model - ${model.modified || 'Unknown date'}`
      }));
    } else {
      console.log("Not adding local models because:", { 
        showLocalModels, 
        isOllamaAvailable, 
        localModelsLength: localModels?.length 
      });
    }
    
    // Make sure the current model is included in the options
    if (currentTeleprompterModel) {
      // Check if it's already in any group
      const isIncluded = Object.values(providerGroups)
        .flat()
        .some(option => option.value === currentTeleprompterModel);
        
      if (!isIncluded) {
        // First check if it's a local model
        const localModel = localModels.find(m => m.name === currentTeleprompterModel);
        if (localModel) {
          if (!providerGroups["local"]) {
            providerGroups["local"] = [];
          }
          if (!providerGroups["local"].some(o => o.value === currentTeleprompterModel)) {
            providerGroups["local"].push({
              value: localModel.name,
              label: localModel.name,
              title: `Local Ollama Model`
            });
          }
        } else {
          // Otherwise check the regular models
          const currentModelObj = models.find(m => m.id === currentTeleprompterModel);
          if (currentModelObj) {
            const provider = currentModelObj.provider;
            if (!providerGroups[provider]) {
              providerGroups[provider] = [];
            }
            providerGroups[provider].push({
              value: currentModelObj.id,
              label: currentModelObj.name,
              title: currentModelObj.description
            });
          }
        }
      }
    }

    // Debug what's actually being used in render
    console.log("TeleprompterModelSelector rendering with:", {
      recommendedModelsForDisplay: nonVisionModels.filter(model => RECOMMENDED_MODELS.includes(model.id)).map(m => m.id),
      otherModelsForDisplay: nonVisionModels.filter(model => !RECOMMENDED_MODELS.includes(model.id)).map(m => m.id),
      googleModelsInDisplay: nonVisionModels.filter(m => m.provider === "google").map(m => ({id: m.id, isVision: m.isVisionModel})),
      localModelsCount: localModels?.length,
      localModelsInDropdown: providerGroups["local"]?.length,
      ollamaAvailable: isOllamaAvailable,
      allProviderGroups: Object.keys(providerGroups)
    });

    // Convert to options format required by CustomDropdown
    return Object.entries(providerGroups).map(([provider, options]) => {
      // Convert provider name for display
      let displayName = getProviderDisplayName(provider)
      
      return {
        label: displayName,
        options: options.sort((a, b) => a.label.localeCompare(b.label))
      }
    }).filter(group => group.options.length > 0)
  }, [models, localModels, showLocalModels, currentTeleprompterModel, nonVisionModels, isOllamaAvailable])

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">Teleprompter</span>
        <div className="flex items-center gap-2">
          {isOllamaAvailable && localModels.length > 0 && (
            <div 
              className="text-[11px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 flex items-center gap-1"
              title={`${localModels.length} local models available`}
            >
              <span>{localModels.length}</span>
            </div>
          )}
          <CustomDropdown
            value={currentTeleprompterModel}
            onChange={handleModelChange}
            options={teleprompterModelOptions}
            className="min-w-[160px]"
            placeholder="Select a model"
          />
        </div>
      </div>
    </div>
  )
}

export default TeleprompterModelSelector 