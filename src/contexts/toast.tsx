import { createContext, useContext } from "react"
import { ToastVariant } from "../components/ui/toast"

interface ToastContextType {
  showToast: (title: string, description: string, variant: ToastVariant) => void
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => {}
})

export const useToast = () => useContext(ToastContext)
