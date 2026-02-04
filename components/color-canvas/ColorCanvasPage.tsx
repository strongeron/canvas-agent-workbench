import { Link2, Move, Palette, Plus, RotateCcw, Trash2, Type } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { CanvasThemePanel } from "../canvas/CanvasThemePanel"
import { useThemeRegistry } from "../../hooks/useThemeRegistry"
import { useColorCanvasState } from "../../hooks/useColorCanvasState"
import type { ThemeToken } from "../../types/theme"
import type { ColorCanvasEdge, ColorCanvasNode } from "../../types/colorCanvas"
import {
  APCA_TARGETS,
  DEFAULT_CONTRAST_TARGET_LC,
  apcaContrast,
  formatLc,
  getApcaStatus,
} from "../../utils/apca"

interface ColorCanvasPageProps {
  tokens: ThemeToken[]
  themeStorageKeyPrefix?: string
}

type ConnectMode = "map" | "contrast" | null
type EdgeFilter = "all" | "map" | "contrast"

const NODE_SIZES: Record<ColorCanvasNode["type"], { width: number; height: number }> = {
  token: { width: 180, height: 70 },
  semantic: { width: 200, height: 78 },
  component: { width: 200, height: 70 },
}

const SEMANTIC_PRESETS: Array<{ label: string; role: ColorCanvasNode["role"] }> = [
  { label: "Text / Foreground", role: "text" },
  { label: "Text / Muted", role: "text" },
  { label: "Surface / Base", role: "surface" },
  { label: "Surface / Subtle", role: "surface" },
  { label: "Border / Default", role: "border" },
  { label: "Icon / Default", role: "icon" },
]

export function ColorCanvasPage({ tokens, themeStorageKeyPrefix }: ColorCanvasPageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [connectMode, setConnectMode] = useState<ConnectMode>(null)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [themePanelVisible, setThemePanelVisible] = useState(false)
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilter>("all")
  const [panelMode, setPanelMode] = useState<"inspector" | "audit">("inspector")

  const colorTokens = useMemo(
    () => tokens.filter((token) => token.category === "color"),
    [tokens]
  )

  const { themes, activeThemeId, setActiveThemeId, tokenValues, addTheme, updateThemeVar } =
    useThemeRegistry({
      storageKeyPrefix: themeStorageKeyPrefix,
      tokens,
      defaultThemes: [
        {
          id: "thicket",
          label: "Thicket",
          description: "Default gallery theme",
          vars: {},
          groupId: "thicket",
        },
        {
          id: "thicket-light",
          label: "Light UI",
          description: "Thicket preset",
          vars: {},
          groupId: "thicket",
        },
        {
          id: "thicket-dark",
          label: "Dark UI",
          description: "Thicket preset",
          vars: {},
          groupId: "thicket",
        },
      ],
      rootRef,
    })

  const {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    addTokenNode,
    addSemanticNode,
    addComponentNode,
    addTypedEdge,
    removeNode,
    removeEdge,
    undoRemoveEdge,
    canUndoEdgeRemoval,
    updateEdgeRule,
    selectNode,
    selectEdge,
    moveNode,
    updateNodeLabel,
    updateNodeValue,
    updateNodeRole,
    clearSelection,
  } = useColorCanvasState(
    themeStorageKeyPrefix
      ? `${themeStorageKeyPrefix}-color-canvas`
      : "gallery-color-canvas"
  )

  const filteredTokens = useMemo(() => {
    if (!tokenQuery.trim()) return colorTokens
    const lower = tokenQuery.trim().toLowerCase()
    return colorTokens.filter((token) => {
      const haystack = [token.label, token.cssVar, token.subcategory].join(" ").toLowerCase()
      return haystack.includes(lower)
    })
  }, [colorTokens, tokenQuery])

  const nodesById = useMemo(() => {
    return nodes.reduce<Record<string, ColorCanvasNode>>((acc, node) => {
      acc[node.id] = node
      return acc
    }, {})
  }, [nodes])

  const getNodeColor = useCallback(
    (nodeId: string): string | null => {
      const node = nodesById[nodeId]
      if (!node) return null

      if (node.type === "token") {
        if (node.cssVar && tokenValues[node.cssVar]) {
          return tokenValues[node.cssVar]
        }
        return node.value ?? null
      }

      if (node.type === "semantic") {
        const mappingEdge = edges.find(
          (edge) => edge.type === "map" && edge.targetId === node.id
        )
        if (mappingEdge) {
          return getNodeColor(mappingEdge.sourceId)
        }
        return node.value ?? null
      }

      return node.value ?? null
    },
    [edges, nodesById, tokenValues]
  )

  const getEdgeContrast = useCallback(
    (edge: ColorCanvasEdge) => {
      if (edge.type !== "contrast") return null
      const source = nodesById[edge.sourceId]
      const target = nodesById[edge.targetId]
      if (!source || !target) return null

      let textNode = source
      let surfaceNode = target

      if (source.role === "surface" || target.role === "text") {
        textNode = target
        surfaceNode = source
      }

      const textColor = getNodeColor(textNode.id)
      const surfaceColor = getNodeColor(surfaceNode.id)
      if (!textColor || !surfaceColor) return null

      return apcaContrast(textColor, surfaceColor)
    },
    [getNodeColor, nodesById]
  )

  const getEdgeTarget = useCallback(
    (edge: ColorCanvasEdge) => edge.rule?.targetLc ?? DEFAULT_CONTRAST_TARGET_LC,
    []
  )

  const handleAddToken = (token: ThemeToken) => {
    const position = getNextPosition(nodes)
    addTokenNode(token.label, token.cssVar, position)
  }

  const handleAddSemantic = (preset: { label: string; role: ColorCanvasNode["role"] }) => {
    const position = getNextPosition(nodes)
    addSemanticNode(preset.label, preset.role, position)
  }

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-color-node='true']")) return
    clearSelection()
    setConnectSourceId(null)
  }

  const handleNodeClick = (nodeId: string) => {
    if (!connectMode) {
      selectNode(nodeId)
      return
    }

    if (!connectSourceId) {
      setConnectSourceId(nodeId)
      return
    }

    if (connectSourceId === nodeId) {
      setConnectSourceId(null)
      return
    }

    const sourceNode = nodesById[connectSourceId]
    const targetNode = nodesById[nodeId]
    if (!sourceNode || !targetNode) return

    if (connectMode === "map") {
      let sourceId = connectSourceId
      let targetId = nodeId

      if (sourceNode.type === "component" && targetNode.type === "semantic") {
        sourceId = nodeId
        targetId = connectSourceId
      }

      if (sourceNode.type === "semantic" && targetNode.type === "token") {
        sourceId = nodeId
        targetId = connectSourceId
      }

      addTypedEdge(sourceId, targetId, "map")
      setConnectSourceId(null)
      return
    }

    if (connectMode === "contrast") {
      if (sourceNode.type !== "semantic" || targetNode.type !== "semantic") {
        setConnectSourceId(null)
        return
      }
      addTypedEdge(connectSourceId, nodeId, "contrast")
      setConnectSourceId(null)
      return
    }
  }

  const handleEdgeBadgeClick = (edgeId: string) => {
    selectEdge(edgeId)
  }

  const handleEdgeFilterChange = (nextFilter: EdgeFilter) => {
    setEdgeFilter(nextFilter)
    if (selectedEdgeId) {
      const selected = edges.find((edge) => edge.id === selectedEdgeId)
      if (selected && nextFilter !== "all" && selected.type !== nextFilter) {
        selectEdge(null)
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) {
        return
      }
      if ((event.key === "Backspace" || event.key === "Delete") && selectedEdgeId) {
        event.preventDefault()
        removeEdge(selectedEdgeId)
        return
      }
      const isUndo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z"
      if (isUndo && canUndoEdgeRemoval) {
        event.preventDefault()
        undoRemoveEdge()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedEdgeId, removeEdge, undoRemoveEdge, canUndoEdgeRemoval])

  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null
  const selectedEdge = selectedEdgeId ? edges.find((edge) => edge.id === selectedEdgeId) : null
  const visibleEdges =
    edgeFilter === "all" ? edges : edges.filter((edge) => edge.type === edgeFilter)
  const contrastEdges = edges.filter((edge) => edge.type === "contrast")

  return (
    <div
      ref={rootRef}
      className="flex h-full w-full bg-surface-100"
      data-theme={activeThemeId}
    >
      <aside className="flex w-72 flex-col border-r border-default bg-white">
        <div className="border-b border-default px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Color Canvas</h2>
              <p className="text-xs text-muted-foreground">Tokens + roles graph</p>
            </div>
            <button
              type="button"
              onClick={() => setThemePanelVisible(true)}
              className="rounded-md border border-default bg-white p-1.5 text-muted-foreground hover:bg-surface-50"
              aria-label="Open theme editor"
            >
              <Palette className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-b border-default px-4 py-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Theme</label>
          <select
            value={activeThemeId}
            onChange={(e) => setActiveThemeId(e.target.value)}
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-sm text-foreground focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>

        <div className="border-b border-default px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tokens
            </h3>
            <span className="text-[11px] text-muted-foreground">{filteredTokens.length}</span>
          </div>
          <input
            type="text"
            value={tokenQuery}
            onChange={(e) => setTokenQuery(e.target.value)}
            placeholder="Filter color tokens"
            className="w-full rounded-md border border-default bg-white px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:border-brand-300 focus:outline-none focus:ring-1 focus:ring-brand-300"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="space-y-2">
            {filteredTokens.map((token) => (
              <button
                key={token.cssVar}
                type="button"
                onClick={() => handleAddToken(token)}
                className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
              >
                <span
                  className="h-4 w-4 rounded border border-default"
                  style={{
                    background: tokenValues[token.cssVar] || `var(${token.cssVar})`,
                  }}
                />
                <span className="flex-1 truncate font-medium">{token.label}</span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Semantic Roles
            </h3>
            <div className="space-y-2">
              {SEMANTIC_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleAddSemantic(preset)}
                  className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
                >
                  <Type className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate font-medium">{preset.label}</span>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Components
            </h3>
            <button
              type="button"
              onClick={() => addComponentNode("Button / Primary", getNextPosition(nodes))}
              className="flex w-full items-center gap-2 rounded-md border border-default bg-white px-2 py-2 text-left text-xs text-foreground hover:bg-surface-50"
            >
              <Move className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate font-medium">Button / Primary</span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-default bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Connect mode:</span>
            <button
              type="button"
              onClick={() => {
                setConnectMode(connectMode === "map" ? null : "map")
                setConnectSourceId(null)
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                connectMode === "map"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Token → Role
            </button>
            <button
              type="button"
              onClick={() => {
                setConnectMode(connectMode === "contrast" ? null : "contrast")
                setConnectSourceId(null)
              }}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                connectMode === "contrast"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-default text-muted-foreground hover:bg-surface-50"
              }`}
            >
              Contrast
            </button>
            {connectMode && (
              <span className="text-[11px] text-muted-foreground">
                {connectSourceId ? "Select target" : "Select source"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Edges:</span>
            {(["all", "map", "contrast"] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => handleEdgeFilterChange(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  edgeFilter === filter
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-default text-muted-foreground hover:bg-surface-50"
                }`}
              >
                {filter === "all" ? "All" : filter === "map" ? "Map" : "Contrast"}
              </button>
            ))}
            <button
              type="button"
              onClick={undoRemoveEdge}
              disabled={!canUndoEdgeRemoval}
              className="flex items-center gap-2 rounded-full border border-default px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-surface-50 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Undo
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden" onClick={handleWorkspaceClick}>
          <svg className="absolute inset-0 h-full w-full">
            {visibleEdges.map((edge) => {
              const source = nodesById[edge.sourceId]
              const target = nodesById[edge.targetId]
              if (!source || !target) return null
              const sourceSize = NODE_SIZES[source.type]
              const targetSize = NODE_SIZES[target.type]
              const x1 = source.position.x + sourceSize.width / 2
              const y1 = source.position.y + sourceSize.height / 2
              const x2 = target.position.x + targetSize.width / 2
              const y2 = target.position.y + targetSize.height / 2
              const stroke = edge.type === "map" ? "#a5b4fc" : "#f97316"
              return (
                <line
                  key={edge.id}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={2}
                  strokeDasharray={edge.type === "contrast" ? "6 4" : ""}
                />
              )
            })}
          </svg>

          {visibleEdges.map((edge) => {
            const source = nodesById[edge.sourceId]
            const target = nodesById[edge.targetId]
            if (!source || !target) return null
            const sourceSize = NODE_SIZES[source.type]
            const targetSize = NODE_SIZES[target.type]
            const x1 = source.position.x + sourceSize.width / 2
            const y1 = source.position.y + sourceSize.height / 2
            const x2 = target.position.x + targetSize.width / 2
            const y2 = target.position.y + targetSize.height / 2
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2
            const contrast = getEdgeContrast(edge)
            const label = edge.type === "contrast" ? formatLc(contrast) : "Map"
            const absValue = contrast ? Math.abs(contrast) : 0
            const badgeClass =
              edge.type === "contrast"
                ? absValue >= 60
                  ? "bg-emerald-100 text-emerald-700"
                  : absValue >= 30
                    ? "bg-amber-100 text-amber-700"
                    : "bg-rose-100 text-rose-700"
                : "bg-indigo-100 text-indigo-700"

            return (
              <button
                key={`${edge.id}-badge`}
                type="button"
                onClick={() => handleEdgeBadgeClick(edge.id)}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-[10px] font-semibold shadow-sm ${badgeClass}`}
                style={{ left: midX, top: midY }}
              >
                {label}
              </button>
            )
          })}

          {nodes.map((node) => (
            <ColorNode
              key={node.id}
              node={node}
              size={NODE_SIZES[node.type]}
              tokenValues={tokenValues}
              selected={selectedNodeId === node.id}
              connectActive={connectMode !== null}
              connectSourceId={connectSourceId}
              onMove={moveNode}
              onClick={handleNodeClick}
            />
          ))}
        </div>
      </main>

      <aside className="flex w-72 flex-col border-l border-default bg-white">
        {themePanelVisible ? (
          <CanvasThemePanel
            themes={themes}
            activeThemeId={activeThemeId}
            onThemeChange={setActiveThemeId}
            onOpenColorCanvas={() => {}}
            onAddTheme={addTheme}
            onUpdateThemeVar={updateThemeVar}
            tokenValues={tokenValues}
            tokens={tokens}
            onClose={() => setThemePanelVisible(false)}
          />
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-default px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {panelMode === "audit" ? "Audit" : "Inspector"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {panelMode === "audit" ? "APCA contrast report" : "Node + edge details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-full border border-default bg-white p-0.5 text-[10px] font-semibold">
                    {(["inspector", "audit"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPanelMode(mode)}
                        className={`rounded-full px-2 py-0.5 ${
                          panelMode === mode
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-surface-50"
                        }`}
                      >
                        {mode === "audit" ? "Audit" : "Inspect"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setThemePanelVisible(true)}
                    className="rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-foreground hover:bg-surface-50"
                  >
                    Themes
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 text-xs text-foreground">
              {panelMode === "audit" ? (
                <div className="space-y-3">
                  {contrastEdges.length === 0 ? (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Add contrast edges to see APCA status.
                    </div>
                  ) : (
                    contrastEdges.map((edge) => {
                      const contrast = getEdgeContrast(edge)
                      const target = getEdgeTarget(edge)
                      const status = getApcaStatus(contrast, target)
                      const statusClass =
                        status === "pass"
                          ? "bg-emerald-100 text-emerald-700"
                          : status === "fail"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                      const source = nodesById[edge.sourceId]
                      const targetNode = nodesById[edge.targetId]
                      const label = `${source?.label ?? "Unknown"} → ${targetNode?.label ?? "Unknown"}`

                      return (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => {
                            selectEdge(edge.id)
                            setPanelMode("inspector")
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-md border border-default bg-white px-3 py-2 text-left text-xs hover:bg-surface-50"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold text-foreground">{label}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Target Lc {target}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${statusClass}`}>
                            {formatLc(contrast)}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              ) : (
                <>
                  {!selectedNode && !selectedEdge && (
                    <div className="rounded-md border border-dashed border-default bg-white px-3 py-2 text-xs text-muted-foreground">
                      Select a node or edge to inspect details.
                    </div>
                  )}

                  {selectedNode && (
                    <div className="space-y-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Label</label>
                        <input
                          type="text"
                          value={selectedNode.label}
                          onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                          className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                        />
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground">Type</div>
                        <div className="text-xs font-semibold text-foreground">{selectedNode.type}</div>
                      </div>
                      {selectedNode.type === "semantic" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Role</label>
                          <select
                            value={selectedNode.role || ""}
                            onChange={(e) =>
                              updateNodeRole(selectedNode.id, e.target.value as ColorCanvasNode["role"])
                            }
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                          >
                            <option value="">Unspecified</option>
                            <option value="text">Text</option>
                            <option value="surface">Surface</option>
                            <option value="border">Border</option>
                            <option value="icon">Icon</option>
                            <option value="accent">Accent</option>
                          </select>
                        </div>
                      )}
                      {selectedNode.type !== "token" && (
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Color Override</label>
                          <input
                            type="text"
                            value={selectedNode.value || ""}
                            onChange={(e) => updateNodeValue(selectedNode.id, e.target.value)}
                            className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            placeholder="e.g. rgb(0 0 0)"
                          />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeNode(selectedNode.id)}
                        className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove node
                      </button>
                    </div>
                  )}

                  {selectedEdge && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-[11px] text-muted-foreground">Edge type</div>
                        <div className="text-xs font-semibold text-foreground">{selectedEdge.type}</div>
                      </div>
                      {selectedEdge.type === "contrast" && (
                        <>
                          <div>
                            <div className="text-[11px] text-muted-foreground">APCA (approx)</div>
                            <div className="text-xs font-semibold text-foreground">
                              {formatLc(getEdgeContrast(selectedEdge))}
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                              Target Lc
                            </label>
                            <select
                              value={getEdgeTarget(selectedEdge)}
                              onChange={(e) =>
                                updateEdgeRule(selectedEdge.id, { targetLc: Number(e.target.value) })
                              }
                              className="w-full rounded-md border border-default bg-white px-2 py-1 text-xs text-foreground"
                            >
                              {APCA_TARGETS.map((target) => (
                                <option key={target} value={target}>
                                  Lc {target}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div className="text-[11px] text-muted-foreground">Model</div>
                            <div className="rounded-md border border-default bg-surface-50 px-2 py-1 text-[11px] font-semibold text-foreground">
                              OKLCH (default)
                            </div>
                          </div>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => removeEdge(selectedEdge.id)}
                        className="flex items-center gap-2 rounded-md border border-default bg-white px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove edge
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}

function getNextPosition(nodes: ColorCanvasNode[]) {
  const baseX = 120
  const baseY = 80
  const spacingX = 220
  const spacingY = 120
  const index = nodes.length
  const col = index % 3
  const row = Math.floor(index / 3)
  return {
    x: baseX + col * spacingX,
    y: baseY + row * spacingY,
  }
}

function ColorNode({
  node,
  size,
  tokenValues,
  selected,
  connectActive,
  connectSourceId,
  onMove,
  onClick,
}: {
  node: ColorCanvasNode
  size: { width: number; height: number }
  tokenValues: Record<string, string>
  selected: boolean
  connectActive: boolean
  connectSourceId: string | null
  onMove: (id: string, position: { x: number; y: number }) => void
  onClick: (id: string) => void
}) {
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  const handlePointerDown = (e: React.PointerEvent) => {
    if (connectActive) {
      onClick(node.id)
      return
    }
    e.stopPropagation()
    draggingRef.current = true
    offsetRef.current = {
      x: e.clientX - node.position.x,
      y: e.clientY - node.position.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    onMove(node.id, {
      x: e.clientX - offsetRef.current.x,
      y: e.clientY - offsetRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) {
      onClick(node.id)
      return
    }
    draggingRef.current = false
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    onClick(node.id)
  }

  const colorSample =
    node.type === "token" && node.cssVar ? tokenValues[node.cssVar] : node.value

  return (
    <div
      data-color-node="true"
      role="button"
      tabIndex={0}
      className={`absolute rounded-xl border bg-white px-3 py-3 shadow-sm transition-shadow ${
        selected ? "border-brand-500 shadow-md" : "border-default"
      } ${connectSourceId === node.id ? "ring-2 ring-brand-400" : ""}`}
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
      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 rounded border border-default"
          style={{ background: colorSample || "transparent" }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">{node.label}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            {node.cssVar || node.role || node.type}
          </div>
        </div>
        <Link2 className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
