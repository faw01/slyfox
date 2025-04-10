import React, { useEffect, useMemo, useState } from "react"
import { models } from "../../lib/models"
import { CustomDropdown } from "./CustomDropdown"
import { checkOllamaHealth, getLocalModels } from "../../lib/ollama-client"

// Define window global variables
declare global {
  interface Window {
    __CHAT_MODEL__: string;
    __LOCAL_MODELS__?: any[];
  }
}

interface Option {
  value: string;
  label: string;
  title?: string;
}

interface ChatModelSelectorProps {
  currentChatModel: string;
  setChatModel: (model: string) => void;
  showLocalModels?: boolean;
}

// Define supported providers with local models
const providersWithLocalModels = ["openai", "anthropic", "google"];

// Define recommended models
const RECOMMENDED_MODELS = ["gpt-4o", "o3-mini-high", "gemini-2.5-pro-exp", "gemini-2.0-flash", "claude-3-7-sonnet-thinking-high"];

// Debug log to check available models
console.log("===== CHAT MODEL SELECTOR DEBUGGING =====");
console.log("Available models in ChatModelSelector:", models.length);
console.log("Google models in ChatModelSelector:", models.filter(m => m.provider === "google").map(m => m.id));
console.log("Recommended models:", RECOMMENDED_MODELS);
console.log("===== END CHAT MODEL SELECTOR DEBUGGING =====");

// Modify provider display name for readability
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

export const ChatModelSelector: React.FC<ChatModelSelectorProps> = ({
  currentChatModel,
  setChatModel,
  showLocalModels = true
}) => {
  const [isOllamaAvailable, setIsOllamaAvailable] = useState(false);
  const [localModels, setLocalModels] = useState<any[]>([]);

  // Debug log inside component
  useEffect(() => {
    console.log("ChatModelSelector rendered with models:", {
      totalModels: models.length,
      googleModels: models.filter(m => m.provider === "google").length,
      googleModelIds: models.filter(m => m.provider === "google").map(m => m.id),
      currentChatModel,
      localModelsState: localModels?.length,
      isOllamaAvailableState: isOllamaAvailable
    });
  }, [currentChatModel, localModels, isOllamaAvailable]);

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

  // Set default chat model if not set
  useEffect(() => {
    if (!window.__CHAT_MODEL__) {
      window.__CHAT_MODEL__ = "gpt-4o"
      setChatModel("gpt-4o")
    }
  }, [])

  const handleModelChange = (newModel: string) => {
    window.__CHAT_MODEL__ = newModel;
    setChatModel(newModel);
    
    // Check if it's a local model
    const isLocalModel = localModels.some(m => m.id === newModel || m.name === newModel);
  }

  // Filter out STT models but include all models from major providers
  const filteredModels = models.filter(model => 
    !model.isSTTModel && // Filter out STT models
    (!model.isVisionModel || 
    RECOMMENDED_MODELS.includes(model.id) || 
    model.provider === "openai" || // Include all OpenAI models regardless of vision flag
    model.provider === "google" || // Include all Google models regardless of vision flag
    model.provider === "anthropic" || // Include all Anthropic models regardless of vision flag
    model.provider === "meta" || // Include all Meta models regardless of vision flag
    model.provider === "deepseek") // Include all DeepSeek models regardless of vision flag
  );

  const chatModelOptions = useMemo(() => {
    // Additional debug logging for local models
    console.log("chatModelOptions calculation with:", {
      localModelsAvailable: localModels?.length || 0,
      ollamaAvailable: isOllamaAvailable,
      showLocalModels: showLocalModels
    });
    
    // Group models by provider
    let providerGroups: { [key: string]: Option[] } = {}
    
    // First add recommended models group
    providerGroups["recommended"] = RECOMMENDED_MODELS
      .map(id => filteredModels.find(m => m.id === id))
      .filter(Boolean)
      .map((model: any) => ({
        value: model.id,
        label: model.name,
        title: model.description
      }));
    
    // Then add remaining models by provider
    filteredModels.forEach(model => {
      // Skip if it's already in recommended
      if (RECOMMENDED_MODELS.includes(model.id)) return;
      
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
    if (currentChatModel) {
      // Check if it's already in any group
      const isIncluded = Object.values(providerGroups)
        .flat()
        .some(option => option.value === currentChatModel);
        
      if (!isIncluded) {
        // First check if it's a local model
        const localModel = localModels.find(m => m.name === currentChatModel);
        if (localModel) {
          if (!providerGroups["local"]) {
            providerGroups["local"] = [];
          }
          if (!providerGroups["local"].some(o => o.value === currentChatModel)) {
            providerGroups["local"].push({
              value: localModel.name,
              label: localModel.name,
              title: `Local Ollama Model`
            });
          }
        } else {
          // Otherwise check the regular models
          const currentModelObj = models.find(m => m.id === currentChatModel);
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
    console.log("ChatModelSelector rendering with:", {
      recommendedModelsForDisplay: filteredModels.filter(model => RECOMMENDED_MODELS.includes(model.id)).map(m => m.id),
      otherModelsForDisplay: filteredModels.filter(model => !RECOMMENDED_MODELS.includes(model.id)).map(m => m.id),
      googleModelsInDisplay: filteredModels.filter(m => m.provider === "google").map(m => ({id: m.id, isVision: m.isVisionModel})),
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
  }, [models, localModels, showLocalModels, currentChatModel, filteredModels, isOllamaAvailable])

  return (
    <div className="mb-3 px-2 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] leading-none text-white/90">Chat Model</span>
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
            value={currentChatModel}
            onChange={handleModelChange}
            options={chatModelOptions}
            className="min-w-[160px]"
            placeholder="Select a chat model"
          />
        </div>
      </div>
    </div>
  )
} 