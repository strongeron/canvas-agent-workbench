import { Link2 } from "lucide-react"
import { useRef } from "react"
import { DesignSystemNodePreview } from "./DesignSystemNodePreview"
import type { ColorCanvasNode } from "../../types/colorCanvas"
import { COLOR_NODE_PORT_META, ColorNodePortId, ConnectMode, formatPreviewKindLabel, getColorNodePortOffset, getNodeFamilyBadgeClass, getNodeFamilyLabel, getPortIdsForConnectMode, stripFrameworkPrefix } from "./colorCanvasShared"
import { formatRelativeChannel } from "./colorCanvasColorMath"

export function ColorNode({
  node,
  size,
  minSize,
  portIds,
  toCanvasPosition,
  resolveColor,
  resolveIsP3,
  resolveExpression,
  resolveLabel,
  selected,
  highlighted,
  dimmed,
  connectActive,
  connectMode,
  connectDragging,
  connectSourceId,
  movable,
  onMove,
  onResize,
  onClick,
  onConnectStart,
  showFullLabels,
}: {
  node: ColorCanvasNode
  size: { width: number; height: number }
  minSize: { width: number; height: number }
  portIds: ColorNodePortId[]
  toCanvasPosition: (clientX: number, clientY: number) => { x: number; y: number }
  resolveColor: (nodeId: string) => string | null
  resolveIsP3: (nodeId: string) => boolean
  resolveExpression: (nodeId: string) => string | null
  resolveLabel: (nodeId: string) => string
  selected: boolean
  highlighted: boolean
  dimmed: boolean
  connectActive: boolean
  connectMode: ConnectMode
  connectDragging: boolean
  connectSourceId: string | null
  movable: boolean
  onMove: (id: string, position: { x: number; y: number }) => void
  onResize: (id: string, size: { width: number; height: number }) => void
  onClick: (id: string) => void
  onConnectStart: (id: string, event: React.PointerEvent) => void
  showFullLabels: boolean
}) {
  const draggingRef = useRef(false)
  const resizingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const resizeStartRef = useRef({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
  })
  const releasePointerCapture = (event: React.PointerEvent) => {
    const candidates = [event.target as HTMLElement | null, event.currentTarget as HTMLElement | null]
    candidates.forEach((candidate) => {
      if (candidate?.hasPointerCapture?.(event.pointerId)) {
        candidate.releasePointerCapture(event.pointerId)
      }
    })
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    if (!movable) return
    if (resizingRef.current) return
    draggingRef.current = true
    const point = toCanvasPosition(e.clientX, e.clientY)
    offsetRef.current = {
      x: point.x - node.position.x,
      y: point.y - node.position.y,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      const point = toCanvasPosition(e.clientX, e.clientY)
      const nextWidth = Math.max(
        minSize.width,
        Math.round(resizeStartRef.current.width + (point.x - resizeStartRef.current.x))
      )
      const nextHeight = Math.max(
        minSize.height,
        Math.round(resizeStartRef.current.height + (point.y - resizeStartRef.current.y))
      )
      onResize(node.id, {
        width: nextWidth,
        height: nextHeight,
      })
      return
    }
    if (!draggingRef.current) return
    const point = toCanvasPosition(e.clientX, e.clientY)
    onMove(node.id, {
      x: point.x - offsetRef.current.x,
      y: point.y - offsetRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (resizingRef.current) {
      resizingRef.current = false
      releasePointerCapture(e)
      return
    }
    if (!movable) {
      onClick(node.id)
      return
    }
    if (connectDragging) {
      return
    }
    if (!draggingRef.current) {
      onClick(node.id)
      return
    }
    draggingRef.current = false
    releasePointerCapture(e)
    onClick(node.id)
  }

  const colorSample = resolveColor(node.id)
  const isP3 = resolveIsP3(node.id)
  const expression = resolveExpression(node.id)
  const normalizeChroma = (value: number) => {
    const normalized = Math.abs(value) > 1 ? value / 100 : value
    return Number(normalized.toFixed(3))
  }
  const relativeSummary = (() => {
    if (node.type !== "relative" || !node.relative) return null
    const parts = [
      { label: "L", value: formatRelativeChannel(node.relative.lMode, node.relative.lValue, "%") },
      {
        label: "C",
        value: formatRelativeChannel(node.relative.cMode, node.relative.cValue, "", normalizeChroma),
      },
      { label: "H", value: formatRelativeChannel(node.relative.hMode, node.relative.hValue, "°") },
      { label: "A", value: formatRelativeChannel(node.relative.alphaMode, node.relative.alphaValue, "%") },
    ]
    const changed = parts.filter((part) => part.value !== "inherit")
    if (changed.length === 0) return "Inherits base"
    return changed.map((part) => `${part.label} ${part.value}`).join(" · ")
  })()
  const relativeBaseLabel =
    showFullLabels && node.type === "relative" && node.relative?.baseId
      ? `From ${resolveLabel(node.relative.baseId)}`
      : null
  const displayLabel = stripFrameworkPrefix(node.label, node.framework)
  const labelLine = node.preview
    ? node.preview.description ||
      node.preview.note ||
      formatPreviewKindLabel(node.preview.kind)
    : showFullLabels
      ? expression || node.cssVar || node.role || node.type
      : node.cssVar || node.role || node.type
  const surfaceClass = node.preview
    ? selected
      ? "border-sky-500 bg-sky-50 shadow-md ring-1 ring-sky-200"
      : highlighted
        ? "border-sky-500 bg-sky-50 shadow-lg ring-2 ring-sky-300"
      : "border-sky-200 bg-sky-50/80 shadow-sm"
    : node.group === "system-support"
      ? selected
        ? "border-emerald-500 bg-emerald-50 shadow-md ring-1 ring-emerald-200"
        : highlighted
          ? "border-emerald-500 bg-emerald-50 shadow-lg ring-2 ring-emerald-300"
        : "border-emerald-200 bg-emerald-50/80 shadow-sm"
      : selected
        ? "border-brand-500 bg-white shadow-md"
        : highlighted
          ? "border-brand-500 bg-white shadow-lg ring-2 ring-brand-200"
        : "border-default bg-white shadow-sm"
  const groupBadge =
    node.group === "system-support"
      ? "System support"
      : node.preview
        ? "Preview"
        : null
  const familyBadge = !node.preview && node.type !== "token" ? getNodeFamilyLabel(node, "badge") : null
  const hasMetadataBadges =
    Boolean(groupBadge || familyBadge || node.preview?.badge || isP3)
  const activeConnectPortIds =
    connectActive && connectMode && !connectDragging
      ? getPortIdsForConnectMode(node, connectMode).filter((portId) =>
          COLOR_NODE_PORT_META[portId].direction === "out"
        )
      : []
  const handleResizePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClick(node.id)
    draggingRef.current = false
    resizingRef.current = true
    const point = toCanvasPosition(e.clientX, e.clientY)
    resizeStartRef.current = {
      x: point.x,
      y: point.y,
      width: size.width,
      height: size.height,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  return (
    <div
      data-color-node="true"
      data-node-id={node.id}
      data-edge-highlighted={highlighted ? "true" : "false"}
      data-edge-dimmed={dimmed ? "true" : "false"}
      role="button"
      tabIndex={0}
      className={`absolute overflow-visible rounded-xl border px-3 py-3 transition-shadow ${
        surfaceClass
      } ${dimmed ? "opacity-15 saturate-[0.35]" : "opacity-100"} ${
        connectSourceId === node.id ? "ring-2 ring-brand-400" : ""
      } ${
        movable ? "cursor-move" : "cursor-pointer"
      }`}
      style={{
        width: size.width,
        height: size.height,
        left: node.position.x,
        top: node.position.y,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {portIds
        .filter((portId) => !activeConnectPortIds.includes(portId))
        .map((portId) => {
          const meta = COLOR_NODE_PORT_META[portId]
          const offset = getColorNodePortOffset(size, portId)
          return (
            <span
              key={portId}
              className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm"
              title={meta.label}
              style={{
                left: offset.x,
                top: offset.y,
                backgroundColor: meta.direction === "out" ? meta.color : "#ffffff",
                border: `2px solid ${meta.color}`,
              }}
            />
          )
        })}
      {activeConnectPortIds.map((portId) => {
        const meta = COLOR_NODE_PORT_META[portId]
        const offset = getColorNodePortOffset(size, portId)
        return (
          <button
            key={`connect-${portId}`}
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation()
              onConnectStart(node.id, e)
            }}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-transform hover:scale-110"
            style={{
              left: offset.x,
              top: offset.y,
              backgroundColor: meta.color,
              border: "2px solid white",
              boxShadow: `0 0 0 2px ${meta.color}33`,
            }}
            aria-label={meta.label}
          />
        )
      })}
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div
          className={`grid items-start gap-x-2.5 gap-y-1.5 ${
            node.preview ? "grid-cols-[1fr,auto]" : "grid-cols-[auto,1fr,auto]"
          }`}
        >
          {!node.preview && (
            <div
              className="mt-0.5 h-6 w-6 shrink-0 rounded-md border border-default"
              style={{ background: colorSample || "transparent" }}
            />
          )}
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-5 text-foreground">{displayLabel}</div>
            <div
              className="truncate text-[10px] leading-4 text-muted-foreground"
              title={showFullLabels ? labelLine : undefined}
            >
              {labelLine}
            </div>
          </div>
          <div className="flex shrink-0 items-start pt-0.5">
            <div className="rounded-full bg-surface-50 p-1 text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
            </div>
          </div>
          {(hasMetadataBadges || relativeSummary || relativeBaseLabel) && (
            <div className="-mt-0.5 col-span-full min-w-0">
              {hasMetadataBadges && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {familyBadge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${getNodeFamilyBadgeClass(node)}`}
                    >
                      {familyBadge}
                    </span>
                  )}
                  {groupBadge && !node.preview?.badge && (
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      {groupBadge}
                    </span>
                  )}
                  {node.preview?.badge && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-semibold text-sky-700">
                      {node.preview.badge}
                    </span>
                  )}
                  {isP3 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                      P3
                    </span>
                  )}
                </div>
              )}
              {relativeSummary && (
                <div className="mt-1 truncate text-[9px] leading-4 text-muted-foreground">{relativeSummary}</div>
              )}
              {relativeBaseLabel && (
                <div className="mt-0.5 truncate text-[9px] leading-4 text-muted-foreground">{relativeBaseLabel}</div>
              )}
            </div>
          )}
        </div>
        {node.preview && (
          <div
            className="min-h-0 flex-1 overflow-auto pr-1 pt-2"
            data-system-preview-scroll="true"
          >
            <DesignSystemNodePreview preview={node.preview} />
          </div>
        )}
      </div>
      <button
        type="button"
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-sm border border-default bg-white/90 text-muted-foreground shadow-sm hover:border-brand-400 hover:text-foreground"
        aria-label="Resize node"
      >
        <span className="pointer-events-none absolute bottom-0.5 right-0.5 text-[9px] leading-none">
          ↘
        </span>
      </button>
    </div>
  )
}

