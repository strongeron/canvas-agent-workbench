import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import {
  computeWrittenSyncTarget,
  normalizeSyncTargetState,
} from "../vite/api/syncTargetState"

const tmpDirs: string[] = []

afterEach(async () => {
  await Promise.all(
    tmpDirs
      .splice(0)
      .map((d) => fs.rm(d, { recursive: true, force: true }).catch(() => undefined))
  )
})

describe("computeWrittenSyncTarget — server recomputes realpath, never trusts the client", () => {
  it("overwrites a bogus client-supplied resolvedRealPath with the server-computed realpath", async () => {
    const real = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), "synctarget-"))
    )
    tmpDirs.push(real)

    const result = await computeWrittenSyncTarget({
      rootPath: real,
      // A malicious/buggy client pins an arbitrary realpath.
      resolvedRealPath: "/totally/bogus/attacker/controlled",
      componentsDir: "src/components",
      format: "html",
      mappedAt: "2026-05-17T00:00:00.000Z",
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    // The persisted realpath is what the SERVER resolved, not the client's.
    expect(result.syncTarget.resolvedRealPath).toBe(real)
    expect(result.syncTarget.resolvedRealPath).not.toBe(
      "/totally/bogus/attacker/controlled"
    )
    expect(result.syncTarget.componentsDir).toBe("src/components")
  })

  it("rejects when rootPath does not resolve (deleted/never existed)", async () => {
    const missing = path.join(os.tmpdir(), `synctarget-missing-${Date.now()}`)
    const result = await computeWrittenSyncTarget({
      rootPath: missing,
      resolvedRealPath: missing,
      componentsDir: "",
      format: "html",
      mappedAt: "",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/could not be resolved/i)
  })

  it("rejects when rootPath is absent", async () => {
    const result = await computeWrittenSyncTarget({ componentsDir: "x" })
    expect(result.ok).toBe(false)
  })
})

describe("normalizeSyncTargetState", () => {
  it("returns null when rootPath is missing", () => {
    expect(normalizeSyncTargetState({})).toBeNull()
    expect(normalizeSyncTargetState(null)).toBeNull()
  })

  it("defaults format to html and resolves rootPath", () => {
    const n = normalizeSyncTargetState({
      rootPath: "/tmp/x/../x",
      format: "weird",
    })
    expect(n?.rootPath).toBe(path.resolve("/tmp/x/../x"))
    expect(n?.format).toBe("html")
  })
})
