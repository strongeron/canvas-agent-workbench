import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  applyTokenMutation,
  listProjectDesignTokens,
  parseDesignTokens,
  writeProjectDesignToken,
} from "../utils/canvasTokenCss"

async function makeWorkspace() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "canvas-tokens-"))
  await fs.mkdir(path.join(dir, "projects", "demo"), { recursive: true })
  return dir
}

describe("canvas token CSS", () => {
  it("parses project-level tokens from :root CSS", () => {
    const tokens = parseDesignTokens(`:root {
  --color-brand-600: rgb(37, 71, 53);
  --space-md: 16px;
}`)

    expect(tokens).toEqual([
      { name: "--color-brand-600", value: "rgb(37, 71, 53)", category: "color" },
      { name: "--space-md", value: "16px", category: "spacing" },
    ])
  })

  it("sets and deletes tokens without touching data outside :root", () => {
    const next = applyTokenMutation(`.x { color: red; }\n`, {
      type: "set",
      name: "--color-brand-600",
      value: "rgb(37, 71, 53)",
    })

    expect(next).toContain(".x { color: red; }")
    expect(next).toContain(":root")
    expect(next).toContain("--color-brand-600: rgb(37, 71, 53)")

    const deleted = applyTokenMutation(next, { type: "delete", name: "--color-brand-600" })
    expect(deleted).not.toContain("--color-brand-600")
  })

  it("creates tokens.css when missing and rejects unguarded overwrite when present", async () => {
    const workspaceRoot = await makeWorkspace()

    const created = await writeProjectDesignToken(
      {
        projectId: "demo",
        mutation: { type: "set", name: "--color-brand-600", value: "rgb(37, 71, 53)" },
      },
      { workspaceRoot }
    )

    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(created.mtimeMs).toBeGreaterThan(0)
    expect(created.sourceCss).toContain("--color-brand-600")

    const unguarded = await writeProjectDesignToken(
      {
        projectId: "demo",
        mutation: { type: "set", name: "--color-brand-600", value: "red" },
      },
      { workspaceRoot }
    )

    expect(unguarded.ok).toBe(false)
    if (unguarded.ok) return
    expect(unguarded.code).toBe("mtime-required")
  })

  it("lists an empty token set when tokens.css does not exist", async () => {
    const workspaceRoot = await makeWorkspace()

    const result = await listProjectDesignTokens({ projectId: "demo" }, { workspaceRoot })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.tokens).toEqual([])
    expect(result.mtimeMs).toBeNull()
  })
})
