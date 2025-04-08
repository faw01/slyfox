import "./App.css"
import SubscribedApp from "./_pages/SubscribedApp"
import { UpdateNotification } from "./components/UpdateNotification"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useCallback, useEffect } from "react"
import {
  Toast,
  ToastDescription,
  ToastMessage,
  ToastProvider,
  ToastTitle,
  ToastVariant,
  ToastViewport
} from "./components/ui/toast"
import { ToastContext } from "./contexts/toast"
import { ElectronAPI } from "./types/electron"

// Declare global window property
declare global {
  interface Window {
    __LANGUAGE__: string;
    __MODEL__: string;
    __VISION_MODEL__: string;
    __STT_MODEL__: string;
    __TELEPROMPTER_MODEL__: string;
    electronAPI: ElectronAPI;
  }
}

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: Infinity,
      retry: 1,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 1
    }
  }
})

// Root component that provides the QueryClient
function App() {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => {
    if (!window.__LANGUAGE__) {
      window.__LANGUAGE__ = "python"
    }
    return window.__LANGUAGE__
  })
  const [currentModel, setCurrentModel] = useState<string>(() => {
    if (!window.__MODEL__) {
      window.__MODEL__ = "gpt-4o"
    }
    return window.__MODEL__
  })
  const [credits, setCredits] = useState<number>(1)

  // Helper function to safely update language
  const updateLanguage = useCallback((newLanguage: string) => {
    setCurrentLanguage(newLanguage)
    window.__LANGUAGE__ = newLanguage
  }, [])

  // Helper function to safely update model
  const updateModel = useCallback((newModel: string) => {
    setCurrentModel(newModel)
    window.__MODEL__ = newModel
  }, [])

  // Initialize window globals if they don't exist
  useEffect(() => {
    // Force set the models and trigger the model update
    window.__MODEL__ = "gpt-4o"
    window.__VISION_MODEL__ = "gpt-4o-mini"
    window.__TELEPROMPTER_MODEL__ = "gpt-4o"
    window.__LANGUAGE__ = window.__LANGUAGE__ || "python"
    
    // Update the state and trigger model selection
    setCurrentModel("gpt-4o")
    window.electronAPI.setModel("gpt-4o").catch(console.error)
  }, [])

  // Initialize STT model
  useState<string>(() => {
    if (!window.__STT_MODEL__) {
      window.__STT_MODEL__ = "deepgram-nova-3"
    }
    return window.__STT_MODEL__
  })

  // Show toast method
  const showToast = useCallback(
    (title: string, description: string, variant: ToastVariant) => {
      setToastMessage({ title, description, variant })
      setToastOpen(true)
    },
    []
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastContext.Provider value={{ showToast }}>
          <div className="transition-colors">
            <SubscribedApp 
              credits={credits}
              currentLanguage={currentLanguage}
              setLanguage={updateLanguage}
              currentModel={currentModel}
              setModel={updateModel}
            />
            <UpdateNotification />
            <Toast
              open={toastOpen}
              onOpenChange={setToastOpen}
              variant={toastMessage.variant}
              duration={3000}
            >
              <ToastTitle>{toastMessage.title}</ToastTitle>
              <ToastDescription>{toastMessage.description}</ToastDescription>
            </Toast>
            <ToastViewport />
          </div>
        </ToastContext.Provider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App
