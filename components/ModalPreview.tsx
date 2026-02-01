import { Eye } from "lucide-react"
import { useState } from "react"

interface ModalPreviewProps {
  Component: React.ComponentType<any>
  props: any
  title: string
  subtitle?: string
  size?: "small" | "medium" | "large"
}

const sizeClasses = {
  small: "max-w-md",
  medium: "max-w-lg",
  large: "max-w-3xl",
}

export function ModalPreview({ Component, props, title, subtitle, size = "medium" }: ModalPreviewProps) {
  const [showLiveDemo, setShowLiveDemo] = useState(false)

  return (
    <>
      <div className="relative">
        <div className="transform scale-75 origin-center rounded-xl border border-default bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-default bg-surface-50 px-4 py-3">
            <div className="flex-1 pr-4">
              <h3 className="text-foreground text-sm font-semibold">{title}</h3>
              {subtitle && (
                <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
              )}
            </div>
            <div className="text-muted shrink-0 rounded-lg bg-white p-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <div className="bg-surface-50 px-4 py-8 text-center">
            <p className="text-muted-foreground text-sm">
              {props.children || "Modal content preview"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex justify-center">
          <button
            onClick={() => setShowLiveDemo(true)}
            className="text-brand-700 hover:bg-brand-50 flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Launch Interactive Demo
          </button>
        </div>
      </div>

      {showLiveDemo && (
        <Component
          {...props}
          isOpen={true}
          onClose={() => setShowLiveDemo(false)}
        />
      )}
    </>
  )
}
