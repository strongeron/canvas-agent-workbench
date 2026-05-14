import { useCallback, useEffect, useMemo, useState } from "react"

import type { CanvasMarkdownItem as CanvasMarkdownItemType } from "../../types/canvas"
import { listMarkdownBlocks } from "../../utils/canvasMarkdownWriter"
import {
  performCanvasMarkdownWrite,
  type CanvasMarkdownWriteClientResult,
} from "../../utils/canvasMarkdownWriteClient"
import { CanvasMarkdownPreview } from "./CanvasMarkdownPreview"

interface CanvasLayoutMarkdownItemProps {
  item: CanvasMarkdownItemType
  isSelected: boolean
  onSelect: (addToSelection?: boolean) => void
  onUpdate: (updates: Partial<Omit<CanvasMarkdownItemType, "id">>) => void
  scale: number
  interactMode: boolean
  onWriteSuccess?: (result: CanvasMarkdownWriteClientResult) => void
}

const MIN_WIDTH = 280
const MIN_HEIGHT = 180

export function CanvasLayoutMarkdownItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  scale,
  interactMode,
  onWriteSuccess,
}: CanvasLayoutMarkdownItemProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 })
  const [activeBlockIndex, setActiveBlockIndex] = useState<number | null>(null)
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [writeState, setWriteState] = useState<{ status: "idle" | "saving" | "error"; error: string }>({
    status: "idle",
    error: "",
  })
  const blocks = useMemo(() => listMarkdownBlocks(item.source), [item.source])

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (interactMode) return
      e.stopPropagation()
      e.preventDefault()
      onSelect()
      setIsResizing(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setInitialSize({ width: item.size.width, height: item.size.height })
    },
    [interactMode, item.size.height, item.size.width, onSelect]
  )

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / scale
      const dy = (e.clientY - dragStart.y) / scale
      onUpdate({
        size: {
          width: Math.max(MIN_WIDTH, initialSize.width + dx),
          height: Math.max(MIN_HEIGHT, initialSize.height + dy),
        },
      })
    }

    const handleMouseUp = () => setIsResizing(false)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [dragStart.x, dragStart.y, initialSize.height, initialSize.width, isResizing, onUpdate, scale])

  useEffect(() => {
    if (editingBlockIndex === null) return
    if (editingBlockIndex >= blocks.length) {
      setEditingBlockIndex(null)
      setEditingValue("")
    }
  }, [blocks.length, editingBlockIndex])

  const commitEditing = useCallback(async () => {
    if (editingBlockIndex === null) return
    setWriteState({ status: "saving", error: "" })
    try {
      const result = await performCanvasMarkdownWrite(
        {
          source: item.source,
          sourcePath: item.sourcePath,
          sourceFileMtime: item.sourceFileMtime,
        },
        {
          action: "update",
          blockIndex: editingBlockIndex,
          newText: editingValue,
        }
      )
      onUpdate({
        source: result.source,
        ...(typeof result.mtimeMs === "number" ? { sourceFileMtime: result.mtimeMs } : {}),
      })
      onWriteSuccess?.(result)
      setWriteState({ status: "idle", error: "" })
      setEditingBlockIndex(null)
      setEditingValue("")
    } catch (error) {
      setWriteState({
        status: "error",
        error: error instanceof Error ? error.message : "Failed to update markdown block.",
      })
    }
  }, [editingBlockIndex, editingValue, item.source, item.sourceFileMtime, item.sourcePath, onUpdate, onWriteSuccess])

  const cancelEditing = useCallback(() => {
    setEditingBlockIndex(null)
    setEditingValue("")
    setWriteState({ status: "idle", error: "" })
  }, [])

  const reorderBlock = useCallback(
    async (direction: "up" | "down") => {
      if (activeBlockIndex === null) return
      const targetIndex = direction === "up" ? activeBlockIndex - 1 : activeBlockIndex + 1
      if (targetIndex < 0 || targetIndex >= blocks.length) return
      setWriteState({ status: "saving", error: "" })
      try {
        const result = await performCanvasMarkdownWrite(
          {
            source: item.source,
            sourcePath: item.sourcePath,
            sourceFileMtime: item.sourceFileMtime,
          },
          {
            action: "reorder",
            fromIndex: activeBlockIndex,
            toIndex: targetIndex,
          }
        )
        onUpdate({
          source: result.source,
          ...(typeof result.mtimeMs === "number" ? { sourceFileMtime: result.mtimeMs } : {}),
        })
        onWriteSuccess?.(result)
        setActiveBlockIndex(targetIndex)
        setWriteState({ status: "idle", error: "" })
      } catch (error) {
        setWriteState({
          status: "error",
          error: error instanceof Error ? error.message : "Failed to reorder markdown blocks.",
        })
      }
    },
    [activeBlockIndex, blocks.length, item.source, item.sourceFileMtime, item.sourcePath, onUpdate, onWriteSuccess]
  )

  const borderClass = isSelected
    ? "border border-brand-400 ring-2 ring-brand-400/15 shadow-sm"
    : "border border-default"

  return (
    <div
      className="relative h-full w-full"
      data-canvas-item-id={item.id}
      data-canvas-item-type={item.type}
      onMouseDown={(e) => {
        if (interactMode) return
        if (e.button !== 0) return
        const target = e.target as HTMLElement | null
        if (target?.closest("[data-markdown-block-interactive='true']")) {
          return
        }
        e.stopPropagation()
        if (!e.shiftKey) onSelect(false)
      }}
      onClick={(e) => {
        if (interactMode) return
        e.stopPropagation()
        if (e.shiftKey) onSelect(true)
      }}
    >
      <div
        className={`relative h-full w-full overflow-hidden rounded-lg bg-white shadow-card ${borderClass}`}
      >
        {writeState.status === "error" ? (
          <div className="absolute left-3 right-3 top-3 z-10 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
            {writeState.error}
          </div>
        ) : null}
        <CanvasMarkdownPreview
          source={item.source}
          title={item.title}
          background={item.background}
          activeBlockIndex={activeBlockIndex}
          editingBlockIndex={editingBlockIndex}
          editingValue={editingValue}
          onEditingValueChange={setEditingValue}
          onEditingBlur={() => {
            void commitEditing()
          }}
          onEditingKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault()
              void commitEditing()
              return
            }
            if (event.key === "Escape") {
              event.preventDefault()
              cancelEditing()
            }
          }}
          onBlockClick={(index) => {
            onSelect(false)
            setActiveBlockIndex(index)
          }}
          onBlockDoubleClick={(index) => {
            onSelect(false)
            setActiveBlockIndex(index)
            setEditingBlockIndex(index)
            setEditingValue(blocks[index]?.source || "")
            setWriteState({ status: "idle", error: "" })
          }}
          onMoveBlockUp={() => {
            void reorderBlock("up")
          }}
          onMoveBlockDown={() => {
            void reorderBlock("down")
          }}
          canMoveBlockUp={(index) => index > 0 && writeState.status !== "saving"}
          canMoveBlockDown={(index) => index < blocks.length - 1 && writeState.status !== "saving"}
        />
      </div>

      {isSelected && !interactMode && (
        <button
          type="button"
          onMouseDown={handleResizeStart}
          className="absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-full border border-brand-400 bg-white shadow-sm hover:bg-brand-100"
          aria-label="Resize"
        />
      )}
    </div>
  )
}
