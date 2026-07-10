import { useCallback, useMemo, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"

import type {
  CanvasArtboardItem,
  CanvasExcalidrawItem,
  CanvasHtmlBundleFileInput,
  CanvasHtmlBundleImportInput,
  CanvasHtmlBundleImportResult,
  CanvasItem,
  CanvasItemInput,
  CanvasMediaItem,
  CanvasMermaidItem,
  CanvasTransform,
} from "../types/canvas"
import {
  inferDiagramFileKind,
  parseExcalidrawFileContent,
  parseMarkdownFileContent,
  parseMermaidFileContent,
} from "../components/canvas/diagramFileImport"
import { normalizeCanvasEmbedUrl } from "../components/canvas/embedUrl"
import {
  inferMediaKindFromFile,
  inferMediaKindFromSrc,
  storeCanvasDocumentMediaFile,
  storeLocalMediaFile,
} from "../components/canvas/mediaStorageService"
import { buildPrimitiveInstantiateInput } from "../utils/canvasLibraryInstantiate"
import { escapeHtmlText } from "../utils/canvasNativeComponentShell"
import type { CanvasRegistryPrimitive } from "../utils/canvasRegistry"
import type { CanvasMcpAppTransport } from "../utils/mcpApp"
import type { CanvasHistoryToast } from "./useCanvasMutationHistory"

export async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error("Failed to read blob asset."))
    reader.onload = () => {
      if (typeof reader.result !== "string" || !reader.result) {
        reject(new Error("Failed to build data URL for blob asset."))
        return
      }
      resolve(reader.result)
    }
    reader.readAsDataURL(blob)
  })
}

export async function serializeHtmlBundleFiles(files: File[]): Promise<CanvasHtmlBundleFileInput[]> {
  const serialized = await Promise.all(
    files.map(async (file) => ({
      relativePath: file.webkitRelativePath?.trim() || file.name,
      dataUrl: await blobToDataUrl(file),
    }))
  )
  return serialized.filter((file) => file.relativePath.trim())
}

export async function serializeHtmlBundleFileEntries(
  entries: Array<{ file: File; relativePath: string }>
): Promise<CanvasHtmlBundleFileInput[]> {
  const serialized = await Promise.all(
    entries.map(async (entry) => ({
      relativePath: entry.relativePath.trim(),
      dataUrl: await blobToDataUrl(entry.file),
    }))
  )
  return serialized.filter((file) => file.relativePath.trim())
}

function stripFileExtension(fileName: string) {
  const trimmed = fileName.trim()
  if (!trimmed) return ""
  return trimmed.replace(/\.[^.]+$/, "")
}

const DEFAULT_MERMAID_SOURCE = `flowchart LR
  A[Start] --> B{Need references?}
  B -->|yes| C[Search]
  B -->|no| D[Draft]
  C --> D
  D --> E[Ship]`

const DEFAULT_MARKDOWN_SOURCE = `# Markdown Node

Drop a \`.md\` file or paste markdown here.

## Why this helps

- Keep architecture notes inside canvas
- Mix docs with embeds, media, and diagrams
- Give Copilot context directly on the board
`

interface UseCanvasAddHandlersInput {
  items: CanvasItem[]
  selectedIds: string[]
  selectedArtboardItem: CanvasArtboardItem | null
  addItem: (item: CanvasItemInput, options?: { id?: string }) => string
  transform: CanvasTransform
  workspaceSize: { width: number; height: number }
  activeProjectId?: string
  activeCanvasFilePath: string | null
  /**
   * FOX2-71: guarantees a `.canvas` file exists before an asset is stored —
   * pasting into a project draft materializes the file first so the asset
   * lands in the canvas's own `.assets/` (FOX2-69).
   */
  ensureCanvasFileMaterialized: () => Promise<{ path: string } | null>
  emitUserAction: (action: string, payload?: Record<string, unknown>) => void
  emitFileLifecycle: (action: string, meta?: Record<string, unknown>) => void
  setPropsPanelVisible: Dispatch<SetStateAction<boolean>>
  setSidebarVisible: Dispatch<SetStateAction<boolean>>
  setHistoryToast: Dispatch<SetStateAction<CanvasHistoryToast | null>>
  importCanvasHtmlBundle: (
    filePath: string,
    bundle: CanvasHtmlBundleImportInput
  ) => Promise<CanvasHtmlBundleImportResult>
  refreshCanvasFiles: () => Promise<void>
  runCanvasPersistenceTask: <T>(task: () => Promise<T>) => Promise<T>
}

/**
 * The "add a node" cluster: placement helpers deciding where a new/pasted
 * node lands (FOX2-59), the add handlers for every asset kind, and the
 * artboard add-menu dispatchers (FOX2-59 method 4). Extracted from CanvasTab
 * (FOX2-62 Scale-1 PR 2).
 */
export function useCanvasAddHandlers({
  items,
  selectedIds,
  selectedArtboardItem,
  addItem,
  transform,
  workspaceSize,
  activeProjectId,
  activeCanvasFilePath,
  ensureCanvasFileMaterialized,
  emitUserAction,
  emitFileLifecycle,
  setPropsPanelVisible,
  setSidebarVisible,
  setHistoryToast,
  importCanvasHtmlBundle,
  refreshCanvasFiles,
  runCanvasPersistenceTask,
}: UseCanvasAddHandlersInput) {
  // The add-menu media choice routes through a hidden file input, with the
  // target artboard parked in a ref across the native file-picker round trip.
  const artboardMediaInputRef = useRef<HTMLInputElement>(null)
  const artboardMediaTargetRef = useRef<string | null>(null)

  // Where a new/pasted node lands (FOX2-59): a selected artboard, else the
  // artboard containing the current selection, else null (open canvas).
  const addTargetArtboardId = useMemo(() => {
    if (selectedArtboardItem) return selectedArtboardItem.id
    for (const id of selectedIds) {
      const item = items.find((candidate) => candidate.id === id)
      if (item?.parentId) {
        const parent = items.find((candidate) => candidate.id === item.parentId)
        if (parent?.type === "artboard") return parent.id
      }
    }
    return null
  }, [items, selectedArtboardItem, selectedIds])
  const nextArtboardChildOrder = useCallback(
    (artboardId: string) => {
      const siblings = items.filter(
        (item) => item.parentId === artboardId && item.type !== "artboard"
      )
      return siblings.reduce((max, item) => Math.max(max, item.order ?? 0), -1) + 1
    },
    [items]
  )
  // Placement for a newly added asset (markdown/mermaid/media/etc): into the
  // selected artboard's flow when there is one and the caller didn't pin an
  // explicit position (e.g. a drop), else null → freeform (FOX2-58).
  const resolveAssetArtboardPlacement = useCallback(
    (explicitPosition?: { x: number; y: number }) => {
      if (explicitPosition || !addTargetArtboardId) return null
      return { parentId: addTargetArtboardId, order: nextArtboardChildOrder(addTargetArtboardId) }
    },
    [addTargetArtboardId, nextArtboardChildOrder]
  )
  // Explicit parentId (drop/add-menu/agent) wins; else fall back to the
  // selected-artboard placement (FOX2-58/59/63).
  const resolveAddPlacement = useCallback(
    (input?: { parentId?: string; position?: { x: number; y: number } }) =>
      input?.parentId
        ? { parentId: input.parentId, order: nextArtboardChildOrder(input.parentId) }
        : resolveAssetArtboardPlacement(input?.position),
    [nextArtboardChildOrder, resolveAssetArtboardPlacement]
  )

  const handleAddEmbed = useCallback(
    (
      url: string,
      input?: {
        position?: { x: number; y: number }
        parentId?: string
        via?: "add-menu"
      }
    ) => {
      const normalized = normalizeCanvasEmbedUrl(url)
      const embedWidth = 640
      const embedHeight = 360
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY

      const placement = resolveAddPlacement({ parentId: input?.parentId, position: input?.position })
      addItem({
        type: "embed",
        url: normalized.url,
        embedPreviewMode: "auto",
        embedFrameStatus: "unknown",
        embedSnapshotStatus: "idle",
        embedLiveStatus: "idle",
        embedCaptureStatus: "idle",
        position: {
          x: Math.max(0, targetX - embedWidth / 2),
          y: Math.max(0, targetY - embedHeight / 2),
        },
        size: { width: embedWidth, height: embedHeight },
        rotation: 0,
        ...(placement ?? {}),
      })
      if (placement) emitUserAction("create-item", { itemType: "embed", parentId: placement.parentId, target: "artboard", ...(input?.via ? { via: input.via } : {}) })

      if (normalized.wasNormalized && typeof window !== "undefined") {
        window.console.info(`[Canvas Embed] ${normalized.reason || "URL normalized."}`)
      }
      setPropsPanelVisible(true)
    },
    [addItem, emitUserAction, resolveAddPlacement, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  const handleAddHtmlBundle = useCallback(
    async (input: {
      files?: File[]
      fileEntries?: Array<{ file: File; relativePath: string }>
      title?: string
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      if (!activeProjectId) {
        throw new Error("Select a project before importing an HTML bundle.")
      }

      // FOX2-69 (FB-2): importing a bundle into a draft materializes the
      // canvas file (FOX2-71) instead of demanding a manual save first.
      const canvasPath =
        activeCanvasFilePath ?? (await ensureCanvasFileMaterialized())?.path ?? null
      if (!canvasPath) {
        throw new Error("Save this board to a real .canvas file before importing an HTML bundle.")
      }

      const hasFiles = Array.isArray(input.files) && input.files.length > 0
      const hasFileEntries = Array.isArray(input.fileEntries) && input.fileEntries.length > 0
      if (!hasFiles && !hasFileEntries) {
        throw new Error("Choose an HTML file or folder before importing.")
      }

      try {
        const serializedFiles = hasFileEntries
          ? await serializeHtmlBundleFileEntries(input.fileEntries || [])
          : await serializeHtmlBundleFiles(input.files || [])
        await runCanvasPersistenceTask(async () => {
          const imported = await importCanvasHtmlBundle(canvasPath, {
            title: input.title?.trim() || undefined,
            files: serializedFiles,
          })

          const htmlWidth = 720
          const htmlHeight = 480
          const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
          const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
          const targetX = input.position ? input.position.x : centerX
          const targetY = input.position ? input.position.y : centerY
          const nextTitle =
            input.title?.trim() ||
            imported.entryAsset.split("/").filter(Boolean).pop()?.replace(/\.html?$/i, "") ||
            "HTML bundle"

          const placement = resolveAddPlacement({ parentId: input.parentId, position: input.position })
          addItem({
            type: "html",
            src: imported.entryUrl,
            title: nextTitle,
            sandbox: "allow-scripts allow-same-origin allow-forms allow-modals",
            sourceMode: "bundle",
            entryAsset: imported.entryAsset,
            sourceImportedAt: imported.importedAt,
            position: {
              x: Math.max(0, targetX - htmlWidth / 2),
              y: Math.max(0, targetY - htmlHeight / 2),
            },
            size: { width: htmlWidth, height: htmlHeight },
            rotation: 0,
            ...(placement ?? {}),
          })
          if (placement) emitUserAction("create-item", { itemType: "html", parentId: placement.parentId, target: "artboard", ...(input.via ? { via: input.via } : {}) })
          setPropsPanelVisible(true)
          if (typeof window !== "undefined" && window.innerWidth < 1100) {
            setSidebarVisible(false)
          }
          await refreshCanvasFiles()
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import HTML bundle."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
        throw error instanceof Error ? error : new Error(message)
      }
    },
    [
      activeCanvasFilePath,
      activeProjectId,
      addItem,
      emitUserAction,
      ensureCanvasFileMaterialized,
      importCanvasHtmlBundle,
      refreshCanvasFiles,
      resolveAddPlacement,
      runCanvasPersistenceTask,
      setPropsPanelVisible,
      setSidebarVisible,
      transform.offset.x,
      transform.offset.y,
      transform.scale,
      workspaceSize.height,
      workspaceSize.width,
    ]
  )

  const handleAddInlineHtml = useCallback(
    async (input?: {
      title?: string
      sourceHtml?: string
      sourceReact?: string
      sourceCss?: string
      sourcePath?: string
      sourceHtmlFilePath?: string
      sourceHtmlFileMtime?: number
      sourceReactFilePath?: string
      sourceReactFileMtime?: number
      sourceComponentSlug?: string
      sourceComponentFilePath?: string
      position?: { x: number; y: number }
      size?: { width: number; height: number }
      rotation?: number
      groupId?: string
      parentId?: string
      order?: number
    }) => {
      const htmlWidth = input?.size?.width ?? 720
      const htmlHeight = input?.size?.height ?? 480
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY
      const title = input?.title?.trim() || "Inline HTML"
      const safeTitle = escapeHtmlText(title)
      const sourceHtml =
        input?.sourceHtml?.trim() ||
        `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font: 16px system-ui, sans-serif;
        color: #111827;
        background: #ffffff;
      }
      main {
        width: min(520px, calc(100vw - 48px));
        padding: 32px;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        box-shadow: 0 16px 48px rgb(15 23 42 / 0.12);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.1;
      }
      p {
        margin: 0;
        color: #4b5563;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${safeTitle}</h1>
      <p>Edit this HTML in the right panel, then apply to re-render the node.</p>
    </main>
  </body>
</html>`

      const newId = addItem({
        type: "html",
        title,
        sourceMode: input?.sourceReact ? "react" : "inline",
        sourceHtml,
        sourceReact: input?.sourceReact,
        sourceCss: input?.sourceCss,
        sourcePath: input?.sourcePath,
        sourceHtmlFilePath: input?.sourceHtmlFilePath,
        sourceHtmlFileMtime: input?.sourceHtmlFileMtime,
        sourceReactFilePath: input?.sourceReactFilePath,
        sourceReactFileMtime: input?.sourceReactFileMtime,
        sourceComponentSlug: input?.sourceComponentSlug,
        sourceComponentFilePath: input?.sourceComponentFilePath,
        sandbox: "allow-scripts allow-same-origin allow-forms allow-modals allow-popups",
        position: {
          x: Math.max(0, targetX - htmlWidth / 2),
          y: Math.max(0, targetY - htmlHeight / 2),
        },
        size: { width: htmlWidth, height: htmlHeight },
        rotation: input?.rotation ?? 0,
        groupId: input?.groupId,
        parentId: input?.parentId,
        order: input?.order,
      })
      setPropsPanelVisible(true)
      if (typeof window !== "undefined" && window.innerWidth < 1100) {
        setSidebarVisible(false)
      }
      return newId
    },
    [
      addItem,
      setPropsPanelVisible,
      setSidebarVisible,
      transform.offset.x,
      transform.offset.y,
      transform.scale,
      workspaceSize.height,
      workspaceSize.width,
    ]
  )

  const handleAddMedia = useCallback(
    async (input: {
      src?: string
      file?: File
      mediaKind?: CanvasMediaItem["mediaKind"]
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      const mediaItemId = `canvas-item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      let src = input.src?.trim() || ""
      let mediaKind = input.mediaKind
      let title: string | undefined
      let sourceUrl: string | undefined
      let sourceProvider: string | undefined
      let sourceCapturedAt: string | undefined

      if (input.file) {
        const projectId = activeProjectId?.trim() || ""
        // FOX2-69 (FB-2): assets belong to the canvas's own `.assets/`.
        // Pasting into a project draft is a mutation, so the file
        // materializes first (FOX2-71) and the asset lands with the canvas.
        // The shared browser store remains the primary only when no project
        // is selected at all.
        let canvasPath = activeCanvasFilePath?.trim() || ""
        if (projectId && !canvasPath) {
          canvasPath = (await ensureCanvasFileMaterialized())?.path?.trim() ?? ""
        }
        const canStoreInCanvasDocument = Boolean(projectId && canvasPath)

        let stored = canStoreInCanvasDocument
          ? await storeCanvasDocumentMediaFile({
              projectId,
              canvasPath,
              itemId: mediaItemId,
              file: input.file,
              preferredFileName: input.file.name,
            })
          : await storeLocalMediaFile(input.file)

        // FOX2-69 (FB-2): the shared store is never a silent substitute for
        // the canvas document store. When the document store fails for a
        // reason other than size (size falls through to the session-blob
        // path below), fall back explicitly — toast + `asset-fallback` on
        // the lifecycle feed so agents see it too.
        if (canStoreInCanvasDocument && (stored.status !== "ready" || !stored.mediaUrl)) {
          const documentStoreReason =
            stored.reason || "Failed to store the asset in this canvas."
          if (!/too large|payload|413|max\s+\d+\s*mb/i.test(documentStoreReason)) {
            const fallback = await storeLocalMediaFile(input.file)
            if (fallback.status === "ready" && fallback.mediaUrl) {
              emitFileLifecycle("asset-fallback", {
                itemId: mediaItemId,
                fileName: input.file.name,
                reason: documentStoreReason,
              })
              setHistoryToast({
                id: Date.now(),
                tone: "error",
                message: `Saved to the shared media store, not this canvas — ${documentStoreReason}`,
              })
              stored = fallback
            }
          }
        }

        if (stored.status !== "ready" || !stored.mediaUrl) {
          const reason = stored.reason || "Failed to upload media file."
          const canUseSessionBlob =
            /too large|payload|413|max\s+\d+\s*mb/i.test(reason)

          if (!canUseSessionBlob) {
            // FOX2-70 (FB-3): every store refused the asset — leave a durable
            // record on the lifecycle feed (activity panel + agents), not
            // just the one-shot alert.
            emitFileLifecycle("asset-store-failed", {
              itemId: mediaItemId,
              fileName: input.file.name,
              reason,
            })
            if (typeof window !== "undefined") {
              window.alert(reason)
            }
            return
          }

          src = URL.createObjectURL(input.file)
          mediaKind = mediaKind || inferMediaKindFromFile(input.file)
          title = input.file.name
          sourceProvider = "local-session"
          sourceCapturedAt = new Date().toISOString()
          sourceUrl = `local://${input.file.name}`

          if (typeof window !== "undefined") {
            window.alert(
              "File is above persistent upload limit. Added as local-session media (works now, but won’t survive full page reload)."
            )
          }
        } else {
          src = stored.mediaUrl
          mediaKind = mediaKind || inferMediaKindFromFile(input.file)
          title = input.file.name
          sourceProvider = stored.provider || "local-media-store"
          sourceCapturedAt = stored.storedAt
        }
      }

      if (!src) return
      mediaKind = mediaKind || inferMediaKindFromSrc(src)
      sourceUrl = input.file ? undefined : src

      const mediaWidth = 480
      const mediaHeight = 270
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input.position ? input.position.x : centerX
      const targetY = input.position ? input.position.y : centerY

      const placement = resolveAddPlacement(input)
      addItem(
        {
          type: "media",
          src,
          mediaKind,
          title,
          sourceUrl,
          sourceProvider,
          sourceCapturedAt,
          controls: mediaKind === "video",
          muted: mediaKind === "video" ? true : undefined,
          loop: mediaKind === "gif",
          autoplay: false,
          objectFit: "cover",
          position: {
            x: Math.max(0, targetX - mediaWidth / 2),
            y: Math.max(0, targetY - mediaHeight / 2),
          },
          size: { width: mediaWidth, height: mediaHeight },
          rotation: 0,
          ...(placement ?? {}),
        },
        { id: mediaItemId }
      )
      if (placement) emitUserAction("create-item", { itemType: "media", parentId: placement.parentId, target: "artboard", ...(input.via ? { via: input.via } : {}) })
      setPropsPanelVisible(true)
    },
    [activeCanvasFilePath, activeProjectId, addItem, emitFileLifecycle, emitUserAction, ensureCanvasFileMaterialized, resolveAddPlacement, setHistoryToast, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  const handleAddMermaid = useCallback(
    (input?: {
      source?: string
      title?: string
      mermaidTheme?: CanvasMermaidItem["mermaidTheme"]
      background?: string
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      const source = input?.source?.trim() || DEFAULT_MERMAID_SOURCE
      const mermaidWidth = 640
      const mermaidHeight = 420
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY

      const placement = resolveAddPlacement(input)
      addItem({
        type: "mermaid",
        source,
        title: input?.title?.trim() || "Mermaid diagram",
        mermaidTheme: input?.mermaidTheme || "default",
        background: input?.background || undefined,
        position: {
          x: Math.max(0, targetX - mermaidWidth / 2),
          y: Math.max(0, targetY - mermaidHeight / 2),
        },
        size: { width: mermaidWidth, height: mermaidHeight },
        rotation: 0,
        ...(placement ?? {}),
      })
      if (placement) emitUserAction("create-item", { itemType: "mermaid", parentId: placement.parentId, target: "artboard", ...(input?.via ? { via: input.via } : {}) })
      setPropsPanelVisible(true)
    },
    [addItem, emitUserAction, resolveAddPlacement, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  const handleAddMcpApp = useCallback(
    (input: {
      appName?: string
      transport: CanvasMcpAppTransport
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      const panelWidth = 760
      const panelHeight = 480
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY

      const placement = resolveAddPlacement({ parentId: input?.parentId, position: input?.position })
      addItem({
        type: "mcp-app",
        appName: input.appName?.trim() || "MCP app",
        transport: input.transport,
        status: "disconnected",
        position: {
          x: Math.max(0, targetX - panelWidth / 2),
          y: Math.max(0, targetY - panelHeight / 2),
        },
        size: { width: panelWidth, height: panelHeight },
        rotation: 0,
        ...(placement ?? {}),
      })
      if (placement) emitUserAction("create-item", { itemType: "mcp-app", parentId: placement.parentId, target: "artboard", ...(input?.via ? { via: input.via } : {}) })
      setPropsPanelVisible(true)
    },
    [addItem, emitUserAction, resolveAddPlacement, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  const handleAddMarkdown = useCallback(
    (input?: {
      source?: string
      title?: string
      background?: string
      sourcePath?: string
      sourceImportedAt?: string
      sourceFileMtime?: number
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      const source = input?.source?.trim() || DEFAULT_MARKDOWN_SOURCE
      const markdownWidth = 700
      const markdownHeight = 460
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY

      const placement = resolveAddPlacement(input)
      addItem({
        type: "markdown",
        source,
        title: input?.title?.trim() || "Markdown note",
        background: input?.background || undefined,
        sourcePath: input?.sourcePath,
        sourceImportedAt: input?.sourceImportedAt,
        sourceFileMtime: input?.sourceFileMtime,
        position: {
          x: Math.max(0, targetX - markdownWidth / 2),
          y: Math.max(0, targetY - markdownHeight / 2),
        },
        size: { width: markdownWidth, height: markdownHeight },
        rotation: 0,
        ...(placement ?? {}),
      })
      if (placement) emitUserAction("create-item", { itemType: "markdown", parentId: placement.parentId, target: "artboard", ...(input?.via ? { via: input.via } : {}) })
      setPropsPanelVisible(true)
    },
    [addItem, emitUserAction, resolveAddPlacement, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  const handleAddExcalidraw = useCallback(
    (input?: {
      title?: string
      scene?: CanvasExcalidrawItem["scene"]
      sourceMermaid?: string
      position?: { x: number; y: number }
      parentId?: string
      via?: "add-menu"
    }) => {
      const excalidrawWidth = 760
      const excalidrawHeight = 500
      const centerX = (workspaceSize.width / 2 - transform.offset.x) / transform.scale
      const centerY = (workspaceSize.height / 2 - transform.offset.y) / transform.scale
      const targetX = input?.position ? input.position.x : centerX
      const targetY = input?.position ? input.position.y : centerY

      const placement = resolveAddPlacement({ parentId: input?.parentId, position: input?.position })
      addItem({
        type: "excalidraw",
        title: input?.title?.trim() || "Excalidraw sketch",
        scene: input?.scene || {
          elements: [],
          appState: {
            viewBackgroundColor: "#ffffff",
          },
          files: {},
        },
        sourceMermaid: input?.sourceMermaid,
        position: {
          x: Math.max(0, targetX - excalidrawWidth / 2),
          y: Math.max(0, targetY - excalidrawHeight / 2),
        },
        size: { width: excalidrawWidth, height: excalidrawHeight },
        rotation: 0,
        ...(placement ?? {}),
      })
      if (placement) emitUserAction("create-item", { itemType: "excalidraw", parentId: placement.parentId, target: "artboard", ...(input?.via ? { via: input.via } : {}) })
      setPropsPanelVisible(true)
    },
    [addItem, emitUserAction, resolveAddPlacement, setPropsPanelVisible, transform.offset.x, transform.offset.y, transform.scale, workspaceSize.height, workspaceSize.width]
  )

  // Artboard add-menu dispatch (FOX2-59 method 4): a picked library primitive
  // becomes an html child at the end of the artboard's flow — same conversion
  // as method 3 and the FOX2-58 drop path, so all entry points produce
  // identical items.
  const handleArtboardAddMenuPrimitive = useCallback(
    async (artboardId: string, primitive: CanvasRegistryPrimitive) => {
      if (!activeProjectId) return
      try {
        const input = await buildPrimitiveInstantiateInput(primitive, activeProjectId)
        const order = nextArtboardChildOrder(artboardId)
        emitUserAction("create-item", {
          itemType: "html",
          primitiveId: primitive.id,
          parentId: artboardId,
          order,
          target: "artboard",
          via: "add-menu",
        })
        await handleAddInlineHtml({ ...input, parentId: artboardId, order })
      } catch (error) {
        setHistoryToast({
          id: Date.now(),
          tone: "error",
          message:
            error instanceof Error ? error.message : "Failed to add primitive to artboard.",
        })
      }
    },
    [activeProjectId, emitUserAction, handleAddInlineHtml, nextArtboardChildOrder, setHistoryToast]
  )

  const handleArtboardAddMenuAsset = useCallback(
    (artboardId: string, kind: "html" | "markdown" | "mermaid" | "media") => {
      switch (kind) {
        case "html": {
          const order = nextArtboardChildOrder(artboardId)
          emitUserAction("create-item", {
            itemType: "html",
            parentId: artboardId,
            order,
            target: "artboard",
            via: "add-menu",
          })
          void handleAddInlineHtml({ parentId: artboardId, order })
          break
        }
        case "markdown":
          handleAddMarkdown({ parentId: artboardId, via: "add-menu" })
          break
        case "mermaid":
          handleAddMermaid({ parentId: artboardId, via: "add-menu" })
          break
        case "media":
          artboardMediaTargetRef.current = artboardId
          artboardMediaInputRef.current?.click()
          break
      }
    },
    [
      emitUserAction,
      handleAddInlineHtml,
      handleAddMarkdown,
      handleAddMermaid,
      nextArtboardChildOrder,
    ]
  )

  const handleImportDiagramFile = useCallback(
    async (file: File, position?: { x: number; y: number }) => {
      const kind = inferDiagramFileKind(file.name, file.type)
      if (!kind) return false

      try {
        const content = await file.text()

        if (kind === "markdown") {
          const source = parseMarkdownFileContent(content)
          handleAddMarkdown({
            source,
            title: stripFileExtension(file.name) || "Markdown note",
            position,
          })
          return true
        }

        if (kind === "mermaid") {
          const source = parseMermaidFileContent(content)
          handleAddMermaid({
            source,
            title: stripFileExtension(file.name) || "Mermaid diagram",
            position,
          })
          return true
        }

        const parsed = parseExcalidrawFileContent(content)
        handleAddExcalidraw({
          title: parsed.title || stripFileExtension(file.name) || "Excalidraw sketch",
          scene: parsed.scene,
          sourceMermaid: parsed.sourceMermaid,
          position,
        })
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to import diagram file."
        if (typeof window !== "undefined") {
          window.alert(message)
        }
        return true
      }
    },
    [handleAddExcalidraw, handleAddMarkdown, handleAddMermaid]
  )

  return {
    artboardMediaInputRef,
    artboardMediaTargetRef,
    addTargetArtboardId,
    nextArtboardChildOrder,
    resolveAssetArtboardPlacement,
    resolveAddPlacement,
    handleAddEmbed,
    handleAddHtmlBundle,
    handleAddInlineHtml,
    handleAddMedia,
    handleAddMermaid,
    handleAddMcpApp,
    handleAddMarkdown,
    handleAddExcalidraw,
    handleArtboardAddMenuPrimitive,
    handleArtboardAddMenuAsset,
    handleImportDiagramFile,
  }
}
