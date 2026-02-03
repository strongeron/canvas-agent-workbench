import type { PaperMcpClient } from "../core"

type PaperMcpWindow = Window & {
  paperMcp?: PaperMcpClient
  __paperMcp?: PaperMcpClient
  mcp?: { paper?: PaperMcpClient }
}

export function installPaperMcpBridge() {
  if (typeof window === "undefined") return
  const target = window as PaperMcpWindow
  if (target.paperMcp) return

  const client = target.__paperMcp || target.mcp?.paper
  if (client) {
    target.paperMcp = client
  }
}
