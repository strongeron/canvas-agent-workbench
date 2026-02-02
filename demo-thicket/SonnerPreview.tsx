import { toast } from "sonner"

import { Button } from "./components/ui/button"

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'promise' | 'multiple'

interface ToastAction {
  label: string
  onClick: string
}

interface PromiseConfig {
  loading: string
  success: string
  error: string
}

interface MultipleToast {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface SonnerPreviewProps {
  toastType: ToastType
  message?: string
  description?: string
  action?: ToastAction
  promiseConfig?: PromiseConfig
  toasts?: MultipleToast[]
}

export function SonnerPreview({
  toastType,
  message = 'Toast notification',
  description,
  action,
  promiseConfig,
  toasts,
}: SonnerPreviewProps) {
  const handleTrigger = () => {
    if (
      typeof window !== "undefined" &&
      (window as any).__GALLERY_PREVIEW_DISABLE_TOASTS
    ) {
      return
    }
    switch (toastType) {
      case 'success':
        toast.success(message, { description })
        break
      case 'error':
        toast.error(message, { description })
        break
      case 'warning':
        toast.warning(message, { description })
        break
      case 'info':
        if (action) {
          toast.info(message, {
            description,
            action: {
              label: action.label,
              onClick: () => toast.info(`${action.label} clicked!`),
            },
          })
        } else {
          toast.info(message, { description })
        }
        break
      case 'loading':
        toast.loading(message)
        break
      case 'promise':
        if (promiseConfig) {
          const promise = new Promise((resolve) => setTimeout(resolve, 2000))
          toast.promise(promise, {
            loading: promiseConfig.loading,
            success: promiseConfig.success,
            error: promiseConfig.error,
          })
        }
        break
      case 'multiple':
        if (toasts) {
          toasts.forEach((t, index) => {
            setTimeout(() => {
              switch (t.type) {
                case 'success':
                  toast.success(t.message)
                  break
                case 'error':
                  toast.error(t.message)
                  break
                case 'warning':
                  toast.warning(t.message)
                  break
                case 'info':
                  toast.info(t.message)
                  break
              }
            }, index * 200)
          })
        }
        break
    }
  }

  const getButtonLabel = () => {
    switch (toastType) {
      case 'promise':
        return 'Trigger Promise Toast'
      case 'multiple':
        return `Trigger ${toasts?.length || 0} Toasts`
      case 'loading':
        return 'Trigger Loading Toast'
      default:
        return `Trigger ${toastType.charAt(0).toUpperCase() + toastType.slice(1)} Toast`
    }
  }

  const getDescription = () => {
    switch (toastType) {
      case 'promise':
        return 'Simulates a 2-second async operation'
      case 'multiple':
        return 'Toasts will stack and can be expanded on hover'
      case 'loading':
        return 'Loading toast stays until dismissed'
      default:
        return `Toast will appear in the top-right corner`
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 p-4">
      <Button onClick={handleTrigger} variant="brand">
        {getButtonLabel()}
      </Button>
      <p className="text-muted-foreground text-center text-sm">
        {getDescription()}
      </p>
      {description && (
        <div className="rounded-lg border border-default bg-surface-50 p-3 text-center">
          <p className="text-muted text-xs">
            This toast includes a description: "{description}"
          </p>
        </div>
      )}
      {action && (
        <div className="rounded-lg border border-default bg-surface-50 p-3 text-center">
          <p className="text-muted text-xs">
            This toast has an action button: "{action.label}"
          </p>
        </div>
      )}
    </div>
  )
}
