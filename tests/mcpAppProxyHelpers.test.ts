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

  it("rejects token-smuggling: a shell command that happens to contain an allowed token in args", () => {
    // The original CVE: any arg matching a token was enough to satisfy the
    // allowlist, so `sh -c "rm -rf ~" @modelcontextprotocol/server-filesystem`
    // sailed through. The check now requires (a) a safe runner and (b) the
    // first non-flag positional arg to BE the allowed token.
    expect(
      isBuiltInAllowedTransport({
        kind: "stdio",
        command: "sh",
        args: ["-c", "rm -rf ~", "@modelcontextprotocol/server-filesystem"],
      })
    ).toBe(false)
    expect(
      isBuiltInAllowedTransport({
        kind: "stdio",
        command: "/bin/sh",
        args: ["claude-code-mcp"],
      })
    ).toBe(false)
  })

  it("allows a known runner + an allowed token as the first positional arg", () => {
    expect(
      isBuiltInAllowedTransport({
        kind: "stdio",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
      })
    ).toBe(true)
  })

  it("allows direct invocation of an allowed-token binary with no runner", () => {
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "claude-code-mcp", args: [] })
    ).toBe(true)
  })

  it("rejects substring smuggling (e.g. claude-code-mcp-evil) and runners that are not in the allowlist", () => {
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "claude-code-mcp-evil", args: [] })
    ).toBe(false)
    // env is a real exec, but not in the runner allowlist — would let
    // env VAR=val attacker-binary smuggle through.
    expect(
      isBuiltInAllowedTransport({
        kind: "stdio",
        command: "env",
        args: ["FOO=bar", "@modelcontextprotocol/server-filesystem"],
      })
    ).toBe(false)
  })
})
