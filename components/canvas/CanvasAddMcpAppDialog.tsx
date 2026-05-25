import { useEffect, useState } from "react"

import type { CanvasMcpAppTransport } from "../../utils/mcpApp"
import { MCP_APP_PRESETS, normalizeMcpAppName } from "../../utils/mcpApp"

interface CanvasAddMcpAppDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (input: { appName: string; transport: CanvasMcpAppTransport }) => void | Promise<void>
}

export function CanvasAddMcpAppDialog({
  open,
  onClose,
  onCreate,
}: CanvasAddMcpAppDialogProps) {
  const [presetId, setPresetId] = useState(MCP_APP_PRESETS[0]?.id || "custom-http")
  const preset = MCP_APP_PRESETS.find((entry) => entry.id === presetId) || MCP_APP_PRESETS[0]
  const [appName, setAppName] = useState(preset?.label || "MCP app")
  const [transport, setTransport] = useState<CanvasMcpAppTransport>(
    preset?.transport || { kind: "http", url: "http://127.0.0.1:3001/mcp" }
  )

  useEffect(() => {
    if (!preset) return
    setAppName(preset.label)
    setTransport(preset.transport)
  }, [presetId, preset])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-default bg-white shadow-2xl">
        <div className="border-b border-default px-5 py-4">
          <h3 className="text-base font-semibold text-foreground">Add MCP App</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a live MCP node backed by HTTP/SSE or stdio.
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preset
            </label>
            <select
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {MCP_APP_PRESETS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            {preset?.description && (
              <div className="mt-1 text-xs text-muted-foreground">{preset.description}</div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              App Name
            </label>
            <input
              type="text"
              value={appName}
              onChange={(event) => setAppName(event.target.value)}
              className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transport
            </label>
            <select
              value={transport.kind}
              onChange={(event) =>
                setTransport(
                  event.target.value === "stdio"
                    ? { kind: "stdio", command: "", args: [] }
                    : { kind: "http", url: "http://127.0.0.1:3001/mcp" }
                )
              }
              className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="http">HTTP / SSE</option>
              <option value="stdio">stdio</option>
            </select>
          </div>

          {transport.kind === "http" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                URL
              </label>
              <input
                type="url"
                value={transport.url}
                onChange={(event) => setTransport({ ...transport, url: event.target.value })}
                className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Command
                </label>
                <input
                  type="text"
                  value={transport.command}
                  onChange={(event) => setTransport({ ...transport, command: event.target.value })}
                  className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Args
                </label>
                <input
                  type="text"
                  value={(transport.args || []).join(" ")}
                  onChange={(event) =>
                    setTransport({
                      ...transport,
                      args: event.target.value
                        .split(" ")
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full rounded-md border border-default bg-white px-3 py-2 text-sm text-foreground focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-default px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-default bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onCreate({ appName: normalizeMcpAppName(appName), transport })}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Add MCP App
          </button>
        </div>
      </div>
    </div>
  )
}
