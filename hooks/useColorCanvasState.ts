import { useCallback } from "react"

import { useLocalStorage } from "./useLocalStorage"
import type {
  ColorCanvasState,
  ColorCanvasNode,
  ColorCanvasEdge,
  ColorCanvasEdgeType,
  ColorCanvasEdgeRule,
} from "../types/colorCanvas"
import { DEFAULT_COLOR_MODEL, DEFAULT_CONTRAST_TARGET_LC } from "../utils/apca"

const DEFAULT_STATE: ColorCanvasState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  edgeUndoStack: [],
}

function normalizeState(state: Partial<ColorCanvasState> | null | undefined): ColorCanvasState {
  return {
    nodes: state?.nodes ?? [],
    edges: state?.edges ?? [],
    selectedNodeId: state?.selectedNodeId ?? null,
    selectedEdgeId: state?.selectedEdgeId ?? null,
    edgeUndoStack: state?.edgeUndoStack ?? [],
  }
}

export function useColorCanvasState(storageKey = "gallery-color-canvas") {
  const [rawState, setRawState] = useLocalStorage<ColorCanvasState>(storageKey, DEFAULT_STATE)
  const state = normalizeState(rawState)

  const setState = useCallback(
    (updater: (prev: ColorCanvasState) => ColorCanvasState) => {
      setRawState((prev) => updater(normalizeState(prev)))
    },
    [setRawState]
  )

  const addNode = useCallback(
    (node: Omit<ColorCanvasNode, "id">) => {
      const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setState((prev) => ({
        ...prev,
        nodes: [...prev.nodes, { ...node, id }],
        selectedNodeId: id,
        selectedEdgeId: null,
      }))
      return id
    },
    [setState]
  )

  const updateNode = useCallback(
    (id: string, updates: Partial<Omit<ColorCanvasNode, "id">>) => {
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((node) => (node.id === id ? { ...node, ...updates } : node)),
      }))
    },
    [setState]
  )

  const removeNode = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((node) => node.id !== id),
        edges: prev.edges.filter((edge) => edge.sourceId !== id && edge.targetId !== id),
        selectedNodeId: prev.selectedNodeId === id ? null : prev.selectedNodeId,
        selectedEdgeId: prev.selectedEdgeId,
      }))
    },
    [setState]
  )

  const addEdge = useCallback(
    (edge: Omit<ColorCanvasEdge, "id">) => {
      const id = `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setState((prev) => ({
        ...prev,
        edges: [...prev.edges, { ...edge, id }],
        selectedEdgeId: id,
        selectedNodeId: null,
      }))
      return id
    },
    [setState]
  )

  const updateEdge = useCallback(
    (id: string, updates: Partial<Omit<ColorCanvasEdge, "id">>) => {
      setState((prev) => ({
        ...prev,
        edges: prev.edges.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge)),
      }))
    },
    [setState]
  )

  const removeEdge = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        edges: prev.edges.filter((edge) => edge.id !== id),
        selectedEdgeId: prev.selectedEdgeId === id ? null : prev.selectedEdgeId,
        edgeUndoStack: (() => {
          const removed = prev.edges.find((edge) => edge.id === id)
          if (!removed) return prev.edgeUndoStack
          const nextStack = [removed, ...prev.edgeUndoStack].slice(0, 25)
          return nextStack
        })(),
      }))
    },
    [setState]
  )

  const undoRemoveEdge = useCallback(() => {
    setState((prev) => {
      const [restored, ...remaining] = prev.edgeUndoStack
      if (!restored) return prev
      if (prev.edges.some((edge) => edge.id === restored.id)) {
        return { ...prev, edgeUndoStack: remaining }
      }
      return {
        ...prev,
        edges: [...prev.edges, restored],
        selectedEdgeId: restored.id,
        selectedNodeId: null,
        edgeUndoStack: remaining,
      }
    })
  }, [setState])

  const selectNode = useCallback(
    (id: string | null) => {
      setState((prev) => ({
        ...prev,
        selectedNodeId: id,
        selectedEdgeId: null,
      }))
    },
    [setState]
  )

  const selectEdge = useCallback(
    (id: string | null) => {
      setState((prev) => ({
        ...prev,
        selectedEdgeId: id,
        selectedNodeId: null,
      }))
    },
    [setState]
  )

  const clearSelection = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedNodeId: null,
      selectedEdgeId: null,
    }))
  }, [setState])

  const moveNode = useCallback(
    (id: string, position: { x: number; y: number }) => {
      updateNode(id, { position })
    },
    [updateNode]
  )

  const updateNodeLabel = useCallback(
    (id: string, label: string) => updateNode(id, { label }),
    [updateNode]
  )

  const updateNodeValue = useCallback(
    (id: string, value: string) => updateNode(id, { value }),
    [updateNode]
  )

  const updateNodeRole = useCallback(
    (id: string, role: ColorCanvasNode["role"]) => updateNode(id, { role }),
    [updateNode]
  )

  const addSemanticNode = useCallback(
    (label: string, role: ColorCanvasNode["role"], position: { x: number; y: number }) =>
      addNode({ type: "semantic", label, role, position }),
    [addNode]
  )

  const addTokenNode = useCallback(
    (label: string, cssVar: string, position: { x: number; y: number }) =>
      addNode({ type: "token", label, cssVar, position }),
    [addNode]
  )

  const addComponentNode = useCallback(
    (label: string, position: { x: number; y: number }) =>
      addNode({ type: "component", label, position }),
    [addNode]
  )

  const addTypedEdge = useCallback(
    (
      sourceId: string,
      targetId: string,
      type: ColorCanvasEdgeType
    ) => {
      const rule =
        type === "contrast"
          ? { model: DEFAULT_COLOR_MODEL, targetLc: DEFAULT_CONTRAST_TARGET_LC }
          : { model: DEFAULT_COLOR_MODEL }
      return addEdge({ sourceId, targetId, type, rule })
    },
    [addEdge]
  )

  const updateEdgeRule = useCallback(
    (id: string, updates: ColorCanvasEdgeRule) => {
      setState((prev) => ({
        ...prev,
        edges: prev.edges.map((edge) => {
          if (edge.id !== id) return edge
          return { ...edge, rule: { ...edge.rule, ...updates } }
        }),
      }))
    },
    [setState]
  )

  return {
    state,
    nodes: state.nodes,
    edges: state.edges,
    selectedNodeId: state.selectedNodeId,
    selectedEdgeId: state.selectedEdgeId,
    canUndoEdgeRemoval: state.edgeUndoStack.length > 0,
    addNode,
    addEdge,
    removeNode,
    removeEdge,
    undoRemoveEdge,
    updateEdge,
    updateEdgeRule,
    updateNode,
    moveNode,
    selectNode,
    selectEdge,
    clearSelection,
    updateNodeLabel,
    updateNodeValue,
    updateNodeRole,
    addSemanticNode,
    addTokenNode,
    addComponentNode,
    addTypedEdge,
  }
}
