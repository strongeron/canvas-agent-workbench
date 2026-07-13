import { redactMcpValue } from "../../utils/mcpApp"

export function redactToolArgs(args: unknown) {
  if (!args || typeof args !== "object" || Array.isArray(args)) return {}
  return redactMcpValue(args)
}
