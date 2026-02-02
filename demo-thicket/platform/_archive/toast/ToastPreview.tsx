import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import type { ToastVariant } from "./toast"
import { useToast } from "./ToastContext"

interface ToastConfig {
  id: string
  message: string
  variant: ToastVariant
  duration?: number
}

interface ToastPreviewProps {
  toasts: ToastConfig[]
  variantName: string
}

const variantConfig: Record<
  ToastVariant,
  { icon: typeof CheckCircle; bgColor: string; borderColor: string; iconColor: string; textColor: string }
> = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
    textColor: "text-green-900",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    textColor: "text-red-900",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    iconColor: "text-yellow-600",
    textColor: "text-yellow-900",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    textColor: "text-blue-900",
  },
}

export function ToastPreview({ toasts, variantName }: ToastPreviewProps) {
  const { showToast } = useToast()

  const handleTriggerToast = (toast: ToastConfig) => {
    showToast(toast.message, toast.variant, toast.duration)
  }

  const handleTriggerAll = () => {
    toasts.forEach((toast, index) => {
      setTimeout(() => {
        showToast(toast.message, toast.variant, toast.duration)
      }, index * 200)
    })
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="text-center">
        <p className="text-muted-foreground mb-4 text-sm">
          Click the button{toasts.length > 1 ? 's' : ''} below to trigger {toasts.length > 1 ? 'toast notifications' : 'a toast notification'}
        </p>
        {toasts.length > 1 && (
          <Button
            onClick={handleTriggerAll}
            variant="brand"
            size="sm"
            className="mb-4"
          >
            Trigger All Toasts
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {toasts.map((toast) => {
          const config = variantConfig[toast.variant]
          const Icon = config.icon

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} p-4 shadow-sm`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${config.iconColor}`} aria-hidden="true" />
              <div className="flex-1">
                <p className={`text-sm font-medium ${config.textColor}`}>
                  {toast.message}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <span className="capitalize">{toast.variant}</span>
                  {toast.duration && toast.duration !== 999999 && (
                    <>
                      <span>•</span>
                      <span>{toast.duration / 1000}s duration</span>
                    </>
                  )}
                </div>
              </div>
              <Button
                onClick={() => handleTriggerToast(toast)}
                variant="secondary"
                size="sm"
              >
                Trigger
              </Button>
            </div>
          )
        })}
      </div>

      {toasts.length === 1 && (
        <div className="mt-4 rounded-lg border border-default bg-surface-50 p-3 text-center">
          <p className="text-muted text-xs">
            Toast will appear in the top-right corner and auto-dismiss after {toasts[0].duration ? toasts[0].duration / 1000 : 5} seconds
          </p>
        </div>
      )}

      {toasts.length > 1 && (
        <div className="mt-4 rounded-lg border border-default bg-surface-50 p-3 text-center">
          <p className="text-muted text-xs">
            Toasts will appear stacked in the top-right corner. Each can be dismissed individually.
          </p>
        </div>
      )}
    </div>
  )
}
