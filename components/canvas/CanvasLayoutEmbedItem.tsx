import { useCallback, useEffect, useRef } from "react"

import type { CanvasEmbedItem as CanvasEmbedItemType } from "../../types/canvas"

interface CanvasLayoutEmbedItemProps {
  item: CanvasEmbedItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasEmbedItemType, "id">>) => void
  interactMode: boolean
}

export function CanvasLayoutEmbedItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  interactMode,
}: CanvasLayoutEmbedItemProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const postToEmbed = useCallback(
    (message: Record<string, unknown>) => {
      const targetOrigin = item.embedOrigin || "*"
      iframeRef.current?.contentWindow?.postMessage(message, targetOrigin)
    },
    [item.embedOrigin]
  )

  const requestEmbedState = useCallback(
    (requestId?: string) => {
      postToEmbed({
        type: "getState",
        requestId,
        version: item.embedStateVersion ?? 1,
      })
    },
    [item.embedStateVersion, postToEmbed]
  )

  useEffect(() => {
    if (!item.url || typeof window === "undefined") return
    try {
      const origin = new URL(item.url, window.location.href).origin
      if (origin && origin !== item.embedOrigin) {
        onUpdate({ embedOrigin: origin })
      }
    } catch {
      // Ignore invalid URLs
    }
  }, [item.url, item.embedOrigin, onUpdate])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (item.embedOrigin && event.origin !== item.embedOrigin) return
      if (!event.data || typeof event.data !== "object") return
      const data = event.data as { type?: string; payload?: unknown; version?: number }
      if (data.type !== "state") return
      onUpdate({
        embedState: data.payload,
        embedStateVersion: data.version ?? 1,
        embedOrigin: item.embedOrigin ?? event.origin,
      })
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [item.embedOrigin, onUpdate])

  useEffect(() => {
    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ requestId?: string; targetId?: string }>).detail
      if (detail?.targetId && detail.targetId !== item.id) return
      requestEmbedState(detail?.requestId)
    }
    window.addEventListener("canvas:request-embed-state", handleRequest as EventListener)
    return () =>
      window.removeEventListener("canvas:request-embed-state", handleRequest as EventListener)
  }, [item.id, requestEmbedState])

  const borderClass = isSelected
    ? "border-2 border-brand-500 ring-4 ring-brand-500/20"
    : "border border-default"

  return (
    <div
      className="relative h-full w-full"
      onMouseDown={(e) => {
        if (interactMode) return
        if (e.button !== 0) return
        e.stopPropagation()
        if (!e.shiftKey) {
          onSelect(false)
        }
      }}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) {
          onSelect(true)
        }
      }}
    >
      <div className={`h-full w-full overflow-hidden rounded-lg bg-white shadow-card ${borderClass}`}>
        {item.url ? (
          <iframe
            ref={iframeRef}
            title={item.title || item.url}
            src={item.url}
            allow={item.allow}
            sandbox={item.sandbox}
            className={`h-full w-full ${interactMode ? "pointer-events-auto" : "pointer-events-none"}`}
            onLoad={() => {
              if (item.embedState !== undefined) {
                postToEmbed({
                  type: "setState",
                  payload: item.embedState,
                  version: item.embedStateVersion ?? 1,
                })
              } else {
                requestEmbedState()
              }
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Add a URL to embed
          </div>
        )}
      </div>
    </div>
  )
}
