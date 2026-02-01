export interface Snapshot {
  id: string
  name: string
  description: string
  timestamp: string
  author?: string
  componentData: Record<string, unknown>
}

const STORAGE_KEY = 'component-gallery-snapshots'

export function getSnapshots(): Snapshot[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveSnapshot(snapshot: Omit<Snapshot, 'id' | 'timestamp'>): Snapshot {
  const newSnapshot: Snapshot = {
    ...snapshot,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }

  const snapshots = getSnapshots()
  snapshots.unshift(newSnapshot)

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots))
  return newSnapshot
}

export function deleteSnapshot(id: string): boolean {
  const snapshots = getSnapshots()
  const filtered = snapshots.filter(s => s.id !== id)

  if (filtered.length === snapshots.length) {
    return false
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  return true
}

export function getSnapshotById(id: string): Snapshot | undefined {
  return getSnapshots().find(s => s.id === id)
}

export function clearAllSnapshots(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export const defaultSnapshots: Snapshot[] = [
  {
    id: 'default-1',
    name: 'Initial Design System',
    description: 'Original component designs with brand colors',
    timestamp: '2025-11-01T10:00:00.000Z',
    author: 'Design Team',
    componentData: {},
  },
  {
    id: 'default-2',
    name: 'Refined Typography',
    description: 'Updated font scales and improved readability',
    timestamp: '2025-11-05T14:30:00.000Z',
    author: 'Design Team',
    componentData: {},
  },
]
