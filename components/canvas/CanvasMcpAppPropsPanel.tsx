import { Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { CanvasMcpAppItem } from "../../types/canvas"

interface CanvasMcpAppPropsPanelProps {
  projectId: string
  item: CanvasMcpAppItem
  onChange: (updates: Partial<Omit<CanvasMcpAppItem, "id">>) => void
  onDelete: () => void
  onClose: () => void
}

function splitArgs(value: string) {
  return value
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function CanvasMcpAppPropsPanel({
  projectId,
  item,
  onChange,
  onDelete,
  onClose,
}: CanvasMcpAppPropsPanelProps) {
  const [secretRef, setSecretRef] = useState(
    item.transport.kind === "http" ? item.transport.headersRef || "" : item.transport.envRef || ""
  )
  const [secretValue, setSecretValue] = useState("")
  const [busy, setBusy] = useState<null | "connect" | "disconnect" | "secret">(null)
  const [error, setError] = useState<string | null>(null)

  // Track mount + per-action AbortControllers so we can cancel in-flight
  // connect/disconnect/secret requests when the panel unmounts (the node
  // got deleted, the panel got closed, the active project changed). Without
  // this, the fetch resolves long after the React tree is gone and we run
  // onChange / setBusy / setError against an unmounted tree — at best a
  // memory leak, at worst we resurrect a deleted node's status into the
  // canvas.
  const mountedRef = useRef(true)
  const connectAbortRef = useRef<AbortController | null>(null)
  const disconnectAbortRef = useRef<AbortController | null>(null)
  const secretAbortRef = useRef<AbortController | null>(null)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      connectAbortRef.current?.abort()
      disconnectAbortRef.current?.abort()
      secretAbortRef.current?.abort()
    }
  }, [])

  const safeSetBusy: typeof setBusy = (value) => {
    if (mountedRef.current) setBusy(value)
  }
  const safeSetError: typeof setError = (value) => {
    if (mountedRef.current) setError(value)
  }
  const safeOnChange: typeof onChange = (updates) => {
    if (mountedRef.current) onChange(updates)
  }

  const updateHttpTransport = (updates: Partial<Extract<CanvasMcpAppItem["transport"], { kind: "http" }>>) => {
    if (item.transport.kind !== "http") return
    onChange({ transport: { ...item.transport, ...updates } })
  }

  const updateStdioTransport = (
    updates: Partial<Extract<CanvasMcpAppItem["transport"], { kind: "stdio" }>>
  ) => {
    if (item.transport.kind !== "stdio") return
    onChange({ transport: { ...item.transport, ...updates } })
  }

  async function persistSecretIfNeeded() {
    if (!secretRef.trim() || !secretValue.trim()) return
    safeSetBusy("secret")
    secretAbortRef.current?.abort()
    const controller = new AbortController()
    secretAbortRef.current = controller
    try {
      const response = await fetch("/api/canvas/mcp-app/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ref: secretRef.trim(),
          secret: secretValue.trim(),
        }),
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to save MCP app secret.")
      }
      if (mountedRef.current) setSecretValue("")
    } finally {
      if (secretAbortRef.current === controller) secretAbortRef.current = null
      safeSetBusy(null)
    }
  }

  return (
    <div className="flex h-full w-80 flex-col border-l border-default bg-white">
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">MCP App</h3>
          <p className="text-xs text-muted-foreground">Configure transport and connection state</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600"
            aria-label="Delete MCP app"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-surface-100 hover:text-foreground"
            aria-label="Close MCP app panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 overflow-y-auto p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            App Name
          </label>
          <input
            type="text"
            value={item.appName}
            onChange={(event) => onChange({ appName: event.target.value || "MCP app" })}
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Transport
          </label>
          <select
            value={item.transport.kind}
            onChange={(event) =>
              onChange({
                transport:
                  event.target.value === "stdio"
                    ? { kind: "stdio", command: "", args: [] }
                    : { kind: "http", url: "http://127.0.0.1:3001/mcp" },
              })
            }
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="http">HTTP / SSE</option>
            <option value="stdio">stdio</option>
          </select>
        </div>

        {item.transport.kind === "http" ? (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                URL
              </label>
              <input
                type="url"
                value={item.transport.url}
                onChange={(event) =>
                  updateHttpTransport({ url: event.target.value })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Headers Ref
              </label>
              <input
                type="text"
                value={secretRef}
                onChange={(event) => {
                  setSecretRef(event.target.value)
                  updateHttpTransport({ headersRef: event.target.value || undefined })
                }}
                placeholder="zapier-token"
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Command
              </label>
              <input
                type="text"
                value={item.transport.command}
                onChange={(event) =>
                  updateStdioTransport({ command: event.target.value })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Args
              </label>
              <input
                type="text"
                value={(item.transport.args || []).join(" ")}
                onChange={(event) =>
                  updateStdioTransport({ args: splitArgs(event.target.value) })
                }
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Env Ref
              </label>
              <input
                type="text"
                value={secretRef}
                onChange={(event) => {
                  setSecretRef(event.target.value)
                  updateStdioTransport({ envRef: event.target.value || undefined })
                }}
                placeholder="linear-env"
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Secret Value
          </label>
          <input
            type="password"
            value={secretValue}
            onChange={(event) => setSecretValue(event.target.value)}
            placeholder="Stored server-side only"
            className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="button"
            disabled={busy === "secret" || !secretRef.trim() || !secretValue.trim()}
            onClick={async () => {
              setError(null)
              try {
                await persistSecretIfNeeded()
              } catch (persistError) {
                setError(persistError instanceof Error ? persistError.message : "Failed to save secret.")
              }
            }}
            className="mt-2 rounded-md border border-default bg-surface-50 px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface-100 disabled:opacity-60"
          >
            {busy === "secret" ? "Saving..." : "Save Secret"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy === "connect"}
            onClick={async () => {
              safeSetBusy("connect")
              safeSetError(null)
              connectAbortRef.current?.abort()
              const controller = new AbortController()
              connectAbortRef.current = controller
              try {
                await persistSecretIfNeeded()
                const response = await fetch("/api/canvas/mcp-app/connect", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    nodeId: item.id,
                    appName: item.appName,
                    transport: item.transport,
                  }),
                  signal: controller.signal,
                })
                const payload = await response.json().catch(() => ({}))
                if (!response.ok || !payload?.ok) {
                  throw new Error(payload?.error || "Failed to connect MCP app.")
                }
                safeOnChange({
                  status: "connected",
                  lastError: undefined,
                  toolsCache: Array.isArray(payload.tools) ? payload.tools : [],
                  resourcesCache: Array.isArray(payload.resources) ? payload.resources : [],
                  promptsCache: Array.isArray(payload.prompts) ? payload.prompts : [],
                })
              } catch (connectError) {
                if ((connectError as Error)?.name === "AbortError") return
                safeOnChange({
                  status: "error",
                  lastError: connectError instanceof Error ? connectError.message : "Failed to connect MCP app.",
                })
                safeSetError(
                  connectError instanceof Error ? connectError.message : "Failed to connect MCP app."
                )
              } finally {
                if (connectAbortRef.current === controller) connectAbortRef.current = null
                safeSetBusy(null)
              }
            }}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Connect
          </button>
          <button
            type="button"
            disabled={busy === "disconnect"}
            onClick={async () => {
              safeSetBusy("disconnect")
              safeSetError(null)
              disconnectAbortRef.current?.abort()
              const controller = new AbortController()
              disconnectAbortRef.current = controller
              try {
                const response = await fetch("/api/canvas/mcp-app/disconnect", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    projectId,
                    nodeId: item.id,
                  }),
                  signal: controller.signal,
                })
                const payload = await response.json().catch(() => ({}))
                if (!response.ok || !payload?.ok) {
                  throw new Error(payload?.error || "Failed to disconnect MCP app.")
                }
                safeOnChange({
                  status: "disconnected",
                  lastError: undefined,
                  recentCalls: Array.isArray(payload.recentCalls) ? payload.recentCalls : item.recentCalls,
                })
              } catch (disconnectError) {
                if ((disconnectError as Error)?.name === "AbortError") return
                safeSetError(
                  disconnectError instanceof Error
                    ? disconnectError.message
                    : "Failed to disconnect MCP app."
                )
              } finally {
                if (disconnectAbortRef.current === controller) disconnectAbortRef.current = null
                safeSetBusy(null)
              }
            }}
            className="rounded-md border border-default bg-white px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-50 disabled:opacity-60"
          >
            Disconnect
          </button>
        </div>

        <div className="rounded-md border border-default bg-surface-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </div>
          <div className="mt-1 text-sm text-foreground">{item.status}</div>
          {item.lastError && <div className="mt-2 text-xs text-red-600">{item.lastError}</div>}
          {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  )
}
