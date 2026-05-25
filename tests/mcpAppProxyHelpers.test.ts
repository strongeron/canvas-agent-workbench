import { describe, expect, it } from "vitest"

import { redactToolArgs } from "../vite/api/mcpProxy/logRedaction"
import {
  MAX_MCP_APP_CALLER_DEPTH,
  validateCallerDepth,
} from "../vite/api/mcpProxy/recursionBound"
import {
  describeTransportSignature,
  isBuiltInAllowedTransport,
} from "../vite/api/mcpProxy/stdioAllowlist"

describe("mcp app proxy helpers", () => {
  it("redacts secret-like tool args recursively", () => {
    expect(
      redactToolArgs({
        token: "abc",
        nested: {
          apiKey: "def",
          ok: "value",
        },
      })
    ).toEqual({
      token: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        ok: "value",
      },
    })
  })

  it("rejects caller depths above the bound", () => {
    expect(validateCallerDepth(MAX_MCP_APP_CALLER_DEPTH + 1)).toMatchObject({
      ok: false,
      code: "recursion-too-deep",
    })
    expect(validateCallerDepth(MAX_MCP_APP_CALLER_DEPTH)).toEqual({
      ok: true,
      callerDepth: MAX_MCP_APP_CALLER_DEPTH,
    })
  })

  it("recognizes built-in stdio presets and stable signatures", () => {
    const transport = {
      kind: "stdio" as const,
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem"],
    }
    expect(isBuiltInAllowedTransport(transport)).toBe(true)
    expect(describeTransportSignature(transport)).toBe("npx -y @modelcontextprotocol/server-filesystem")
  })
})
