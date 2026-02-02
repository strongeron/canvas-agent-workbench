import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Sonner Toaster component with custom icons and default configuration
 *
 * Features:
 * - Stacking support (visibleToasts controls max visible)
 * - Rich positioning options
 * - Custom icons for each toast type
 * - Smooth animations
 * - Accessible (screen reader friendly)
 *
 * Usage: Place <Toaster /> once in your app (e.g., in main.tsx)
 * Then use toast() from anywhere:
 *
 * import { toast } from "sonner"
 * toast.success("Changes saved!")
 * toast.error("Something went wrong")
 * toast.warning("Please check your input")
 * toast.info("New update available")
 * toast.loading("Saving...")
 * toast.promise(promise, { loading, success, error })
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      expand={false}
      richColors
      closeButton
      visibleToasts={4}
      gap={8}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        duration: 5000,
        classNames: {
          toast: "group font-sans",
          title: "text-sm font-medium",
          description: "text-sm opacity-90",
          actionButton: "font-medium",
          cancelButton: "font-medium",
          closeButton: "opacity-60 hover:opacity-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
