import {
  FileCode2,
  FileText,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Workflow,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import { type CanvasRegistryPrimitive } from "../../utils/canvasRegistry"

export type CanvasArtboardAddAssetKind =
  | "html"
  | "markdown"
  | "mermaid"
  | "media"
  | "native-component"

interface CanvasArtboardAddMenuProps {
  position: { x: number; y: number }
  artboardName: string
  projectId: string
  onClose: () => void
  onAddPrimitive: (primitive: CanvasRegistryPrimitive) => void
  onAddAsset: (kind: CanvasArtboardAddAssetKind) => void
}

interface PrimitiveFetchState {
  status: "loading" | "ready" | "error"
  primitives: CanvasRegistryPrimitive[]
  error: string
}

const ASSET_ENTRIES: {
  kind: CanvasArtboardAddAssetKind
  label: string
  Icon: typeof FileCode2
}[] = [
  { kind: "html", label: "HTML node", Icon: FileCode2 },
  { kind: "markdown", label: "Markdown note", Icon: FileText },
  { kind: "mermaid", label: "Mermaid diagram", Icon: Workflow },
  { kind: "media", label: "Media…", Icon: ImagePlus },
]

/**
 * Grouped "add into this artboard" picker (FOX2-59 method 4). Opened from the
 * artboard chrome `+` button or the context-menu "Add here…"; every choice
 * inserts at the end of the artboard's flow via the same handlers as
 * methods 1–3.
 */
export function CanvasArtboardAddMenu({
  position,
  artboardName,
  projectId,
  onClose,
  onAddPrimitive,
  onAddAsset,
}: CanvasArtboardAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [fetchState, setFetchState] = useState<PrimitiveFetchState>({
    status: "loading",
    primitives: [],
    error: "",
  })

  // Same registry source as the library panel, so the Components group and
  // method-3 click-instantiate always offer the identical catalog.
  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/canvas/registry/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          ok?: boolean
          primitives?: CanvasRegistryPrimitive[]
          error?: string
        }
        if (!response.ok || !payload.ok || !Array.isArray(payload.primitives)) {
          throw new Error(payload.error || "Failed to load registry.")
        }
        setFetchState({ status: "ready", primitives: payload.primitives, error: "" })
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        setFetchState({
          status: "error",
          primitives: [],
          error: error instanceof Error ? error.message : "Failed to load registry.",
        })
      })
    return () => controller.abort()
  }, [projectId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    // Use requestAnimationFrame to avoid immediate close from the opening click
    const frameId = requestAnimationFrame(() => {
      document.addEventListener("click", handleClickOutside, true)
      document.addEventListener("contextmenu", handleClickOutside, true)
      document.addEventListener("keydown", handleEscape)
    })

    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener("click", handleClickOutside, true)
      document.removeEventListener("contextmenu", handleClickOutside, true)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 260),
    y: Math.min(position.y, Math.max(8, window.innerHeight - 420)),
  }

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    onClose()
    requestAnimationFrame(() => {
      action()
    })
  }

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] flex max-h-[400px] w-60 flex-col rounded-lg border border-default bg-white py-1 shadow-lg"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
      role="menu"
      aria-label={`Add to ${artboardName}`}
      data-artboard-add-menu="true"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="truncate px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Add to {artboardName}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Components
        </div>
        {fetchState.status === "loading" ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Reading registry…
          </div>
        ) : fetchState.status === "error" ? (
          <div className="px-3 py-2 text-[11px] text-red-700">{fetchState.error}</div>
        ) : fetchState.primitives.length === 0 ? (
          <div className="px-3 py-2 text-[11px] italic text-muted-foreground">
            Registry is empty.
          </div>
        ) : (
          fetchState.primitives.map((primitive) => (
            <button
              key={primitive.id}
              type="button"
              onClick={(e) => handleAction(e, () => onAddPrimitive(primitive))}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-surface-100"
              role="menuitem"
              title={primitive.description || primitive.id}
              data-artboard-add-primitive={primitive.id}
            >
              <span className="truncate">{primitive.displayName}</span>
              <span className="shrink-0 rounded bg-surface-100 px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {primitive.kind}
              </span>
            </button>
          ))
        )}
        <button
          type="button"
          onClick={(e) => handleAction(e, () => onAddAsset("native-component"))}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-surface-100"
          role="menuitem"
          data-artboard-add-asset="native-component"
        >
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          New native component…
        </button>
      </div>

      <div className="my-1 border-t border-default" role="separator" />

      <div className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Assets
      </div>
      {ASSET_ENTRIES.map(({ kind, label, Icon }) => (
        <button
          key={kind}
          type="button"
          onClick={(e) => handleAction(e, () => onAddAsset(kind))}
          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-foreground hover:bg-surface-100"
          role="menuitem"
          data-artboard-add-asset={kind}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </button>
      ))}
    </div>,
    document.body
  )
}
