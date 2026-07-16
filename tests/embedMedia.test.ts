import os from "node:os"
import path from "node:path"
import { promises as fs } from "node:fs"

import { afterEach, describe, expect, it, vi } from "vitest"

import { createEmbedMedia } from "../server/embedMedia"

const tempDirs: string[] = []

async function makeStoreDir() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "embed-media-"))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))
  )
})

// 1×1 transparent PNG.
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

describe("embed/media machinery (FOX2-75 slice 8)", () => {
  it("evaluates frame policies from X-Frame-Options and frame-ancestors", () => {
    const api = createEmbedMedia({})

    const denied = api.evaluateFramePolicy({
      xFrameOptions: "DENY",
      frameAncestors: null,
      targetOrigin: "https://target.com",
      appOrigin: "http://localhost:5173",
    })
    expect(denied.embeddable).toBe(false)
    expect(denied.blockedBy).toBeTruthy()

    const open = api.evaluateFramePolicy({
      xFrameOptions: null,
      frameAncestors: null,
      targetOrigin: "https://target.com",
      appOrigin: "http://localhost:5173",
    })
    expect(open.embeddable).toBe(true)

    const ancestors = api.parseFrameAncestorsDirective(
      "default-src 'self'; frame-ancestors 'self' https://allowed.com"
    )
    expect(ancestors).toContain("https://allowed.com")
  })

  it("round-trips media through the store with mime-derived names", async () => {
    const MEDIA_STORE_DIR = await makeStoreDir()
    const api = createEmbedMedia({ MEDIA_STORE_DIR })

    const stored = await api.storeMediaDataUrl(PNG_DATA_URL)
    expect(stored.mimeType).toBe("image/png")
    expect(stored.fileName).toMatch(/\.png$/)
    expect(stored.mediaUrl).toContain("/api/media/file/")

    const read = await api.readStoredMedia(stored.fileName)
    expect(read?.mimeType).toBe("image/png")
    expect(read?.content.length).toBeGreaterThan(20)

    // Path traversal out of the store dir is refused.
    expect(await api.readStoredMedia("../outside.png")).toBeNull()
  })

  it("blocks private and localhost hosts in the media proxy allowlist", () => {
    const api = createEmbedMedia({})
    expect(api.parseProxyMediaUrl("https://cdn.example.com/a.png")).toBeTruthy()
    expect(api.parseProxyMediaUrl("http://127.0.0.1/a.png")).toBeNull()
    expect(api.parseProxyMediaUrl("http://192.168.1.10/a.png")).toBeNull()
    expect(api.parseProxyMediaUrl("http://localhost:3000/a.png")).toBeNull()
    expect(api.parseProxyMediaUrl("not-a-url")).toBeNull()
  })

  it("imports remote assets through the proxy guard into the store", async () => {
    const MEDIA_STORE_DIR = await makeStoreDir()
    const pngBytes = Buffer.from(PNG_DATA_URL.split(",")[1], "base64")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "image/png" }),
        arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
      }))
    )
    const api = createEmbedMedia({
      MEDIA_STORE_DIR,
      inferMediaKindFromMimeType: () => "image",
      filenameFromRemoteUrl: () => "remote.png",
    })

    const imported = await api.importAssetFromRemoteUrl("https://cdn.example.com/pic.png")
    expect(imported.mediaKind).toBe("image")
    expect(imported.mimeType).toBe("image/png")

    await expect(api.importAssetFromRemoteUrl("http://127.0.0.1/pic.png")).rejects.toThrow(
      /Invalid or blocked asset URL/
    )
  })

  it("uses the live-session template when configured and reports no provider otherwise", async () => {
    const templated = createEmbedMedia({
      EMBED_LIVE_TEMPLATE: "https://live.example.com/?target={urlEncoded}",
    })
    const session = await templated.createEmbedLiveSession("https://example.com/a b")
    expect(session?.provider).toBe("template")
    expect(session?.sessionUrl).toContain(encodeURIComponent("https://example.com/a b"))

    const unconfigured = createEmbedMedia({})
    expect(await unconfigured.createEmbedLiveSession("https://example.com")).toBeNull()
  })

  it("normalizes capture providers, targets, and filenames", () => {
    const api = createEmbedMedia({})
    expect(api.normalizeCaptureProvider("playwright")).toBe("playwright")
    expect(api.normalizeCaptureProvider("bogus")).toBe("auto")
    expect(api.normalizeCaptureTargets("both")).toEqual(["desktop", "mobile"])
    expect(api.normalizeCaptureTargets(["mobile", "mobile", "junk"])).toEqual(["mobile"])
    expect(api.normalizeCaptureTargets(undefined)).toEqual(["desktop"])
    expect(api.buildCaptureFilename("https://my-app.example.com/page", "desktop", "image/png")).toBe(
      "my-app-example-com-desktop.png"
    )
  })

  it("keeps mime/extension mapping symmetric for the store formats", () => {
    const api = createEmbedMedia({})
    for (const [mime, ext] of [
      ["image/png", ".png"],
      ["image/jpeg", ".jpg"],
      ["image/gif", ".gif"],
      ["video/mp4", ".mp4"],
    ] as const) {
      expect(api.extensionForMime(mime)).toBe(ext)
      expect(api.mimeTypeForExtension(ext)).toBe(mime)
    }
  })
})
