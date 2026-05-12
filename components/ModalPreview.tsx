import { Eye, X } from "lucide-react"
import { useState } from "react"

interface ModalPreviewProps {
  Component: React.ComponentType<any>
  props: any
  title: string
  subtitle?: string
}

export function ModalPreview({ Component, props, title, subtitle }: ModalPreviewProps) {
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
              <X className="h-4 w-4" />
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
