/**
 * CanvasScenesPanel - Panel for managing saved canvas scenes/templates
 *
 * Features:
 * - Save current canvas as a new scene
 * - Load saved scenes
 * - Rename and delete scenes
 * - Export/import scenes as JSON
 */

import {
  Copy,
  Download,
  Edit2,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useState, useCallback, useRef } from "react"

import type { CanvasScene, CanvasItem, CanvasGroup } from "../../types/canvas"

/** Props for injected Button component */
export interface ButtonComponentProps {
  variant?: "ghost" | "brand" | "outline" | string
  size?: "sm" | "md" | "lg" | string
  onClick?: () => void
  className?: string
  disabled?: boolean
  children: React.ReactNode
}

interface CanvasScenesPanelProps {
  scenes: CanvasScene[]
  currentItemCount: number
  onSave: (name: string) => void
  onLoad: (scene: CanvasScene) => void
  onRename: (sceneId: string, newName: string) => void
  onDelete: (sceneId: string) => void
  onDuplicate: (sceneId: string) => void
  onExport: (sceneId: string) => void
  onImport: (json: string) => void
  onClose: () => void
  /** Injected Button component */
  Button: React.ComponentType<ButtonComponentProps>
}

export function CanvasScenesPanel({
  scenes,
  currentItemCount,
  onSave,
  onLoad,
  onRename,
  onDelete,
  onDuplicate,
  onExport,
  onImport,
  onClose,
  Button,
}: CanvasScenesPanelProps) {
  const [newSceneName, setNewSceneName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [showImport, setShowImport] = useState(false)
  const [importJson, setImportJson] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = useCallback(() => {
    if (currentItemCount === 0) return
    onSave(newSceneName.trim() || `Scene ${scenes.length + 1}`)
    setNewSceneName("")
  }, [currentItemCount, newSceneName, scenes.length, onSave])

  const handleStartEdit = useCallback((scene: CanvasScene) => {
    setEditingId(scene.id)
    setEditingName(scene.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName("")
  }, [editingId, editingName, onRename])

  const handleImport = useCallback(() => {
    try {
      JSON.parse(importJson) // Validate JSON
      onImport(importJson)
      setImportJson("")
      setShowImport(false)
      setImportError(null)
    } catch {
      setImportError("Invalid JSON format")
    }
  }, [importJson, onImport])

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        try {
          JSON.parse(content) // Validate
          onImport(content)
          setImportError(null)
        } catch {
          setImportError("Invalid JSON file")
        }
      }
      reader.readAsText(file)
      e.target.value = "" // Reset input
    },
    [onImport]
  )

  const handleExportToFile = useCallback(
    (sceneId: string) => {
      const scene = scenes.find((s) => s.id === sceneId)
      if (!scene) return

      const json = JSON.stringify(scene, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${scene.name.replace(/\s+/g, "-").toLowerCase()}.scene.json`
      a.click()
      URL.revokeObjectURL(url)
    },
    [scenes]
  )

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-brand-600" />
          <h3 className="text-sm font-semibold text-foreground">Scenes</h3>
          <span className="rounded-full bg-surface-100 px-2 py-0.5 text-xs text-muted-foreground">
            {scenes.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Save New Scene */}
      <div className="border-b border-default px-4 py-3">
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          Save Current Canvas
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSceneName}
            onChange={(e) => setNewSceneName(e.target.value)}
            placeholder={`Scene ${scenes.length + 1}`}
            className="h-8 flex-1 rounded-md border border-default bg-white px-2.5 text-sm text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <Button
            variant="brand"
            size="sm"
            onClick={handleSave}
            disabled={currentItemCount === 0}
            className="h-8 px-3"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Save
          </Button>
        </div>
        {currentItemCount === 0 && (
          <p className="mt-1.5 text-[10px] text-muted">
            Add components to canvas to save a scene
          </p>
        )}
      </div>

      {/* Scenes List */}
      <div className="flex-1 overflow-y-auto">
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <FolderOpen className="mb-2 h-8 w-8 text-muted" />
            <p className="text-sm text-muted-foreground">No saved scenes yet</p>
            <p className="mt-1 text-xs text-muted">
              Save your canvas arrangements to reuse them later
            </p>
          </div>
        ) : (
          <div className="divide-y divide-default">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className="group px-4 py-3 hover:bg-surface-50"
              >
                {editingId === scene.id ? (
                  // Edit mode
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-7 flex-1 rounded border border-brand-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-300"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit()
                        if (e.key === "Escape") {
                          setEditingId(null)
                          setEditingName("")
                        }
                      }}
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="rounded p-1 text-brand-600 hover:bg-brand-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditingName("")
                      }}
                      className="rounded p-1 text-muted-foreground hover:bg-surface-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  // Display mode
                  <>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-foreground">
                          {scene.name}
                        </h4>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {scene.items.length} items · {formatDate(scene.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => onLoad(scene)}
                        className="ml-2 rounded bg-brand-600 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-brand-700 group-hover:opacity-100"
                      >
                        Load
                      </button>
                    </div>
                    {/* Action buttons */}
                    <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => handleStartEdit(scene)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                        title="Rename"
                      >
                        <Edit2 className="h-3 w-3" />
                        Rename
                      </button>
                      <button
                        onClick={() => onDuplicate(scene.id)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                        title="Duplicate"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                      <button
                        onClick={() => handleExportToFile(scene.id)}
                        className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-surface-100 hover:text-foreground"
                        title="Export to file"
                      >
                        <Download className="h-3 w-3" />
                        Export
                      </button>
                      <button
                        onClick={() => onDelete(scene.id)}
                        className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Section */}
      <div className="border-t border-default">
        {showImport ? (
          <div className="px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Import Scene
              </span>
              <button
                onClick={() => {
                  setShowImport(false)
                  setImportJson("")
                  setImportError(null)
                }}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <textarea
              value={importJson}
              onChange={(e) => {
                setImportJson(e.target.value)
                setImportError(null)
              }}
              placeholder="Paste scene JSON here..."
              rows={4}
              className={`w-full resize-none rounded-md border bg-surface-50 px-2.5 py-2 font-mono text-xs text-foreground focus:outline-none focus:ring-1 ${
                importError
                  ? "border-red-300 focus:border-red-300 focus:ring-red-300"
                  : "border-default focus:border-brand-300 focus:ring-brand-300"
              }`}
            />
            {importError && (
              <p className="mt-1 text-xs text-red-600">{importError}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button
                variant="brand"
                size="sm"
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="flex-1"
              >
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                From File
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2">
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Import Scene
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>
    </div>
  )
}
