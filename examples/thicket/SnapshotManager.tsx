import { Camera, Clock, Plus, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { type Snapshot, deleteSnapshot, getSnapshots, saveSnapshot } from "./mocks/snapshots"

export function SnapshotManager() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSnapshotName, setNewSnapshotName] = useState('')
  const [newSnapshotDescription, setNewSnapshotDescription] = useState('')

  useEffect(() => {
    setSnapshots(getSnapshots())
  }, [])

  const handleCreateSnapshot = () => {
    if (!newSnapshotName.trim()) return

    const snapshot = saveSnapshot({
      name: newSnapshotName,
      description: newSnapshotDescription,
      componentData: {},
    })

    setSnapshots([snapshot, ...snapshots])
    setNewSnapshotName('')
    setNewSnapshotDescription('')
    setShowCreateModal(false)
  }

  const handleDeleteSnapshot = (id: string) => {
    if (confirm('Are you sure you want to delete this snapshot?')) {
      deleteSnapshot(id)
      setSnapshots(snapshots.filter(s => s.id !== id))
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-surface-50 p-8 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-foreground mb-2 text-3xl font-bold">
              Version Snapshots
            </h2>
            <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
              Capture and compare different versions of your component designs
              over time.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Create Snapshot
          </button>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="bg-backdrop absolute inset-0 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="bg-surface-50 relative w-full max-w-lg rounded-xl p-6 shadow-2xl">
            <h3 className="font-display text-foreground mb-4 text-xl font-bold">
              Create Snapshot
            </h3>

            <div className="mb-4">
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                Snapshot Name
              </label>
              <input
                type="text"
                value={newSnapshotName}
                onChange={(e) => setNewSnapshotName(e.target.value)}
                placeholder="e.g., Updated Button Styles"
                className="text-foreground placeholder:text-muted w-full rounded-lg border border-default bg-white px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="mb-6">
              <label className="text-muted-foreground mb-2 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={newSnapshotDescription}
                onChange={(e) => setNewSnapshotDescription(e.target.value)}
                placeholder="Describe what changed in this version..."
                rows={3}
                className="text-foreground placeholder:text-muted w-full rounded-lg border border-default bg-white px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-default bg-white px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSnapshot}
                disabled={!newSnapshotName.trim()}
                className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {snapshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-default bg-surface-50 py-16">
          <Camera className="text-muted mb-4 h-12 w-12" />
          <h3 className="text-foreground mb-2 text-lg font-semibold">
            No snapshots yet
          </h3>
          <p className="text-muted-foreground mb-4 text-sm">
            Create your first snapshot to track design changes over time
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {snapshots.map((snapshot) => (
            <div
              key={snapshot.id}
              className="group overflow-hidden rounded-xl border border-default bg-white shadow-sm transition-all hover:shadow-md"
            >
              <div className="bg-gradient-to-br from-brand-50 to-surface-50 p-6">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Camera className="text-brand-600 h-6 w-6" />
                </div>
                <h3 className="text-foreground mb-1 font-semibold">
                  {snapshot.name}
                </h3>
                <p className="text-muted-foreground line-clamp-2 text-sm">
                  {snapshot.description || 'No description provided'}
                </p>
              </div>

              <div className="p-4">
                <div className="text-muted mb-3 flex items-center gap-2 text-xs">
                  <Clock className="h-3 w-3" />
                  {new Date(snapshot.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>

                {snapshot.author && (
                  <div className="text-muted mb-3 text-xs">
                    By {snapshot.author}
                  </div>
                )}

                <div className="flex gap-2">
                  <button className="text-muted-foreground hover:bg-surface-100 hover:text-foreground flex-1 rounded-lg border border-default bg-white px-3 py-2 text-sm font-medium transition-colors">
                    Load
                  </button>
                  <button
                    onClick={() => handleDeleteSnapshot(snapshot.id)}
                    className="hover:bg-error-surface hover:text-error flex items-center gap-1 rounded-lg border border-default bg-white px-3 py-2 text-sm font-medium text-muted-foreground transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
