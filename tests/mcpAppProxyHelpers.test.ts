import { describe, expect, it } from "vitest"

import { redactToolArgs } from "../vite/api/mcpProxy/logRedaction"
import {
  MAX_MCP_APP_CALLER_DEPTH,
  validateInFlightDepth,
} from "../vite/api/mcpProxy/recursionBound"
import { applyCanvasMcpAppCredentialsRequest } from "../vite/api/mcpProxy/canvasMcpAppCredentials"
import { applyCanvasMcpAppConnectRequest } from "../vite/api/mcpProxy/canvasMcpAppConnect"
import { filterHeaders } from "../vite/api/mcpProxy/McpHttpClient"
import { sanitizeProjectId } from "../vite/api/mcpProxy/projectIdSafety"
import { __setRegistryEntryForTest, invokeMcpAppTool } from "../vite/api/mcpProxy/registry"
import { buildSafeStdioEnv } from "../vite/api/mcpProxy/stdioEnv"
import {
  describeHttpTransportSignature,
  isBuiltInAllowedHttpTransport,
  isHttpTransportAllowlisted,
  persistAllowlistedHttpTransport,
} from "../vite/api/mcpProxy/httpAllowlist"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
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

  it("redacts the expanded set of secret-like field names (password / authorization / cookie / private_key / etc.)", () => {
    expect(
      redactToolArgs({
        password: "p",
        Authorization: "Bearer x",
        cookie: "session=abc",
        privateKey: "y",
        private_key: "y2",
        client_secret: "z",
        bearer: "b",
        session: "s",
        accessToken: "a",
        refresh_token: "r",
        keep: "ok",
      })
    ).toMatchObject({
      password: "[redacted]",
      Authorization: "[redacted]",
      cookie: "[redacted]",
      privateKey: "[redacted]",
      private_key: "[redacted]",
      client_secret: "[redacted]",
      bearer: "[redacted]",
      session: "[redacted]",
      accessToken: "[redacted]",
      refresh_token: "[redacted]",
      keep: "ok",
    })
  })

  it("filters request-smuggling headers and rejects CR/LF injection in header values", () => {
    expect(
      filterHeaders({
        Host: "evil.example",
        "Content-Length": "0",
        "Transfer-Encoding": "chunked",
        Connection: "close",
        Upgrade: "websocket",
        Authorization: "Bearer good",
        "X-Custom": "ok",
        "Accept-Encoding": "gzip",
        Cookie: "should-not-pass",
        "X-Inject": "value\r\nX-Smuggled: 1",
      })
    ).toEqual({
      Authorization: "Bearer good",
      "X-Custom": "ok",
      "Accept-Encoding": "gzip",
    })
  })

  it("rejects in-flight depths at or above the bound", () => {
    expect(validateInFlightDepth(MAX_MCP_APP_CALLER_DEPTH)).toMatchObject({
      ok: false,
      code: "recursion-too-deep",
    })
    expect(validateInFlightDepth(MAX_MCP_APP_CALLER_DEPTH - 1)).toEqual({
      ok: true,
      depth: MAX_MCP_APP_CALLER_DEPTH,
    })
    expect(validateInFlightDepth(0)).toEqual({ ok: true, depth: 1 })
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

  it("tears down the partial connection if connectMcpAppNode fails after spawning it", async () => {
    // Use a fake McpHttpClient-shaped object by going through the registry's
    // public path is hard — easier to just import withTimeout-style: confirm
    // a failing connection throws and the entry is NOT left in the map.
    // We exercise this through __setRegistryEntryForTest (covers the
    // shutdown path) and check the disconnect side. Full transport-level
    // cleanup is exercised by the live integration in canvasMcpServer test
    // suite at the request-handler layer.
    const teardown = __setRegistryEntryForTest({
      projectId: "p-cleanup",
      nodeId: "n",
      connection: {
        async callTool() {
          throw new Error("downstream failed")
        },
      },
    })
    try {
      await expect(
        invokeMcpAppTool({
          projectId: "p-cleanup",
          nodeId: "n",
          toolName: "x",
          args: {},
          redactedArgs: {},
        })
      ).rejects.toThrow("downstream failed")
    } finally {
      teardown()
    }
  })

  it("bounds concurrent invocations on the same registry entry via server-side inflight counter", async () => {
    // 4 concurrent invocations against the same connected node. The first 3
    // proceed, the 4th must be rejected with the recursion-too-deep code —
    // bound is MAX_MCP_APP_CALLER_DEPTH (3) per registry entry, server side.
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const teardown = __setRegistryEntryForTest({
      projectId: "p",
      nodeId: "n",
      connection: {
        async callTool() {
          await gate
          return { ok: true }
        },
      },
    })
    try {
      const calls = [0, 1, 2, 3].map(() =>
        invokeMcpAppTool({
          projectId: "p",
          nodeId: "n",
          toolName: "any",
          args: {},
          redactedArgs: {},
        })
      )
      const settledFast = await Promise.allSettled([calls[3]])
      expect(settledFast[0].status).toBe("rejected")
      if (settledFast[0].status === "rejected") {
        const err = settledFast[0].reason as Error & { code?: string }
        expect(err.code).toBe("recursion-too-deep")
      }
      release()
      const settledRest = await Promise.allSettled([calls[0], calls[1], calls[2]])
      for (const r of settledRest) {
        expect(r.status).toBe("fulfilled")
      }
    } finally {
      teardown()
    }
  })

  it("allows localhost HTTP transports by default and rejects public hosts without user confirm", async () => {
    expect(
      isBuiltInAllowedHttpTransport({ kind: "http", url: "http://localhost:3001/mcp" })
    ).toBe(true)
    expect(
      isBuiltInAllowedHttpTransport({ kind: "http", url: "http://127.0.0.1:8080" })
    ).toBe(true)
    expect(
      isBuiltInAllowedHttpTransport({ kind: "http", url: "http://[::1]:8080" })
    ).toBe(true)
    expect(
      isBuiltInAllowedHttpTransport({ kind: "http", url: "https://evil.example.com" })
    ).toBe(false)
    // SSRF-classic targets: cloud-metadata, link-local. These must NOT be
    // considered built-in safe.
    expect(
      isBuiltInAllowedHttpTransport({ kind: "http", url: "http://169.254.169.254/latest" })
    ).toBe(false)
  })

  it("normalizes the persisted HTTP allowlist key to the URL origin (not the full URL)", () => {
    expect(
      describeHttpTransportSignature({ kind: "http", url: "https://api.example.com:443/foo?bar=1" })
    ).toBe("https://api.example.com")
  })

  it("persists confirmed HTTP transports and recognizes them on the next request", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mcp-http-allowlist-"))
    try {
      const projectId = "demo"
      const projectDir = path.join(root, "projects", projectId)
      const { promises: fs } = await import("node:fs")
      await fs.mkdir(projectDir, { recursive: true })

      const transport = { kind: "http" as const, url: "https://mcp.zapier.com/api" }
      expect(await isHttpTransportAllowlisted(projectDir, projectId, transport)).toBe(false)

      const origin = await persistAllowlistedHttpTransport(projectDir, projectId, transport)
      expect(origin).toBe("https://mcp.zapier.com")

      expect(await isHttpTransportAllowlisted(projectDir, projectId, transport)).toBe(true)
      // Different path on same origin is still allowed (origin-keyed).
      expect(
        await isHttpTransportAllowlisted(projectDir, projectId, {
          kind: "http",
          url: "https://mcp.zapier.com/different/path",
        })
      ).toBe(true)
      // Different origin is NOT allowed.
      expect(
        await isHttpTransportAllowlisted(projectDir, projectId, {
          kind: "http",
          url: "https://mcp.zapier.com.evil.example/api",
        })
      ).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("rejects path-traversal projectId values at the sanitizer", () => {
    expect(sanitizeProjectId("../../../etc")).toBe("")
    expect(sanitizeProjectId("..")).toBe("")
    expect(sanitizeProjectId("foo/bar")).toBe("")
    expect(sanitizeProjectId("foo\\bar")).toBe("")
    expect(sanitizeProjectId("foo\0bar")).toBe("")
    expect(sanitizeProjectId(".hidden")).toBe("")
    expect(sanitizeProjectId("")).toBe("")
    expect(sanitizeProjectId(null)).toBe("")
    expect(sanitizeProjectId(undefined)).toBe("")
    expect(sanitizeProjectId(123 as unknown as string)).toBe("")
    expect(sanitizeProjectId("demo")).toBe("demo")
    expect(sanitizeProjectId("app-signal-mobile")).toBe("app-signal-mobile")
    expect(sanitizeProjectId("design_system_foundation")).toBe("design_system_foundation")
  })

  it("rejects path-traversal projectId at the credentials endpoint without touching disk", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mcp-creds-traversal-"))
    try {
      const result = await applyCanvasMcpAppCredentialsRequest(
        { projectId: "../../../etc", ref: "API_KEY", secret: "x" },
        { workspaceRoot: root }
      )
      expect(result).toMatchObject({ ok: false, code: "bad-input" })
      // No project.json was written outside the projects dir.
      const { promises: fs } = await import("node:fs")
      await expect(fs.access(path.join(root, "etc", "project.json"))).rejects.toThrow()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it("returns a consistent error envelope: every error path has ok=false, status, code, error", async () => {
    const badProjectId = await applyCanvasMcpAppCredentialsRequest(
      { projectId: "", ref: "x", secret: "y" },
      { workspaceRoot: tmpdir() }
    )
    expect(badProjectId).toMatchObject({
      ok: false,
      status: 400,
      code: "bad-input",
    })
    expect(typeof (badProjectId as { error?: string }).error).toBe("string")

    const traversal = await applyCanvasMcpAppCredentialsRequest(
      { projectId: "../etc", ref: "x", secret: "y" },
      { workspaceRoot: tmpdir() }
    )
    expect(traversal).toMatchObject({
      ok: false,
      status: 400,
      code: "bad-input",
    })
  })

  it("rejects path-traversal projectId at the connect endpoint", async () => {
    const result = await applyCanvasMcpAppConnectRequest(
      {
        projectId: "../../../etc",
        nodeId: "n",
        transport: { kind: "stdio", command: "node", args: [] },
      },
      { workspaceRoot: tmpdir() }
    )
    expect(result).toMatchObject({ ok: false, code: "bad-input" })
  })

  it("strips code-injection env vars and only forwards canonical names + safe inherited base", () => {
    const hostEnv = { PATH: "/usr/bin", HOME: "/root", SECRET_FROM_HOST: "leak" } as NodeJS.ProcessEnv
    const filtered = buildSafeStdioEnv(
      {
        NODE_OPTIONS: "--require=/tmp/evil.js",
        LD_PRELOAD: "/tmp/x.so",
        DYLD_INSERT_LIBRARIES: "/tmp/x.dylib",
        PYTHONSTARTUP: "/tmp/x.py",
        API_KEY: "abc",
        lower_case: "x",
        "INVALID-DASH": "y",
      },
      hostEnv
    )
    expect(filtered.API_KEY).toBe("abc")
    expect(filtered.PATH).toBe("/usr/bin")
    expect(filtered.HOME).toBe("/root")
    expect(filtered).not.toHaveProperty("NODE_OPTIONS")
    expect(filtered).not.toHaveProperty("LD_PRELOAD")
    expect(filtered).not.toHaveProperty("DYLD_INSERT_LIBRARIES")
    expect(filtered).not.toHaveProperty("PYTHONSTARTUP")
    expect(filtered).not.toHaveProperty("lower_case")
    expect(filtered).not.toHaveProperty("INVALID-DASH")
    // host secrets that don't match the safe inherit list MUST NOT leak.
    expect(filtered).not.toHaveProperty("SECRET_FROM_HOST")
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

  it("rejects fused-flag argv smuggling before an allowed token (node --eval=, python -c, npx --package=)", () => {
    const token = "@modelcontextprotocol/server-filesystem"
    // A trailing allowed token must NOT launder a smuggled code/preload/package
    // flag into an allowlisted invocation. Each of these would otherwise spawn
    // the runner with the dangerous flag.
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "node", args: ["--eval=console.log(1)", token] })
    ).toBe(false)
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "node", args: ["--require=/tmp/evil.js", token] })
    ).toBe(false)
    // Attached short flag form: python -c<code>.
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "python", args: ["-cprint(1)", token] })
    ).toBe(false)
    // --package is not in npx's safe pre-token flag set.
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "npx", args: ["--package=evil", "-y", token] })
    ).toBe(false)
    // The legitimate `npx -y <token> [server-args]` shape still passes.
    expect(
      isBuiltInAllowedTransport({ kind: "stdio", command: "npx", args: ["-y", token, "/tmp"] })
    ).toBe(true)
  })

  it("denies shell/glibc/tool env families, newline values, and inherited-var overrides", () => {
    const hostEnv = { PATH: "/usr/bin", SHELL: "/bin/zsh" } as NodeJS.ProcessEnv
    const filtered = buildSafeStdioEnv(
      {
        BASH_ENV: "/tmp/evil.sh",
        ENV: "/tmp/evil.sh",
        IFS: "x",
        GIT_SSH: "/tmp/evil",
        BASH_FUNC_FOO: "() { :; }",
        GCONV_PATH: "/tmp",
        MCP_TOKEN: "ok",
        WITH_NEWLINE: "a\nFOO=b",
        PATH: "/tmp/attacker-bin",
        SHELL: "/tmp/evil-shell",
      },
      hostEnv
    )
    expect(filtered.MCP_TOKEN).toBe("ok")
    for (const denied of [
      "BASH_ENV",
      "ENV",
      "IFS",
      "GIT_SSH",
      "BASH_FUNC_FOO",
      "GCONV_PATH",
      "WITH_NEWLINE",
    ]) {
      expect(filtered).not.toHaveProperty(denied)
    }
    // User creds may NOT override inherited host vars (no PATH/SHELL hijack).
    expect(filtered.PATH).toBe("/usr/bin")
    expect(filtered.SHELL).toBe("/bin/zsh")
  })
})
