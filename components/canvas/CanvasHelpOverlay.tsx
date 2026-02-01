import { X } from "lucide-react"

interface Shortcut {
  keys: string[]
  description: string
}

interface CanvasHelpOverlayProps {
  shortcuts: Shortcut[]
  onClose: () => void
}

export function CanvasHelpOverlay({ shortcuts, onClose }: CanvasHelpOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[80vh] w-full max-w-md overflow-auto rounded-xl border border-default bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="mb-1 text-lg font-semibold text-foreground">
          Keyboard Shortcuts
        </h3>
        <p className="mb-5 text-sm text-muted-foreground">
          Use these shortcuts to navigate the canvas
        </p>

        <div className="space-y-2">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2"
            >
              <span className="text-sm text-foreground">{shortcut.description}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    {keyIndex > 0 && (
                      <span className="mx-1 text-xs text-muted">or</span>
                    )}
                    <kbd className="rounded border border-default bg-white px-2 py-1 font-mono text-xs text-foreground shadow-sm">
                      {key}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-subtle bg-brand-50/50 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-brand-700">Tip:</span> Press{" "}
            <kbd className="rounded border border-default bg-white px-1.5 py-0.5 font-mono text-[10px]">
              Esc
            </kbd>{" "}
            to close this panel or deselect items
          </p>
        </div>
      </div>
    </div>
  )
}
