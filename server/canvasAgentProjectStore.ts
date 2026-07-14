/**
 * Legacy canvas-agent per-project state (FOX2-75 slice 4): the canvas
 * workspace keeps a parallel record per project — normalized state,
 * primitives, and theme snapshot — owned by the session subsystem and read
 * by several route groups. Previously two bare Maps inline in
 * vite.config.ts; behind an interface the eventual merge into the
 * agent-native workspace store becomes a swap of this factory.
 */
export interface CanvasAgentProjectStateRecord {
  projectId: string
  state: any
  primitives: any[]
  themeSnapshot: any
  updatedAt: string
  sourceClientId: string | null
}

export interface CanvasAgentProjectStore {
  getState(projectId: string): CanvasAgentProjectStateRecord | null
  setState(projectId: string, record: CanvasAgentProjectStateRecord): void
  getPrimitives(projectId: string): any[]
  setPrimitives(projectId: string, primitives: any[]): void
}

export function createCanvasAgentProjectStore(): CanvasAgentProjectStore {
  const stateByProject = new Map<string, CanvasAgentProjectStateRecord>()
  const primitivesByProject = new Map<string, any[]>()

  return {
    getState(projectId) {
      return stateByProject.get(projectId) || null
    },
    setState(projectId, record) {
      stateByProject.set(projectId, record)
    },
    getPrimitives(projectId) {
      return primitivesByProject.get(projectId) || []
    },
    setPrimitives(projectId, primitives) {
      primitivesByProject.set(projectId, primitives)
    },
  }
}
