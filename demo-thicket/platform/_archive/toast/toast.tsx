import { AlertCircle, CheckCircle, Info, X, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

export type ToastVariant = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle; bgColor: string; borderColor: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
  },
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false)
  const config = variantConfig[toast.variant]
  const Icon = config.icon

  useEffect(() => {
    const duration = toast.duration ?? 5000
    const timer = setTimeout(() => {
      setIsExiting(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} p-4 shadow-lg transition-all duration-300 ${
        isExiting
          ? "translate-x-full opacity-0"
          : "translate-x-0 opacity-100"
      }`}
    >
      <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} aria-hidden="true" />
      <p className="text-foreground flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-50 flex w-full flex-col items-end gap-3 p-6"
      aria-label="Notifications"
    >
      <div className="pointer-events-auto flex w-full max-w-md flex-col gap-3">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  )
}
