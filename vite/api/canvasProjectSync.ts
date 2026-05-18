// /api/canvas/project/sync — publish normalized importable code into Root B.
//
// ============================================================================
//  SECURITY / OPERATIONAL HEADER — READ BEFORE EDITING
// ============================================================================
//
//  This endpoint writes to an ARBITRARY user-picked filesystem location
//  OUTSIDE the repo (Root B). It is the highest-risk surface in the canvas
//  feature set. Two non-negotiable operational constraints:
//
//  1. LOCALHOST BIND. The dev server MUST bind `127.0.0.1` (not 0.0.0.0).
//     Because this endpoint widens write scope to arbitrary external paths,
//     a network-reachable instance would be a remote-arbitrary-write hole.
//     `vite.config.ts` adds an Origin/Host localhost guard in front of this
//     route as defense-in-depth; the bind itself is the primary control.
//
//  2. NON-RESTORING ROLLBACK. "All-or-nothing" here means: stage every
//     output file (INCLUDING manifest.json) to a tmp path, validate them
//     all, and only THEN begin the rename batch. If validation fails,
//     nothing is renamed (true all-or-nothing). If a rename fails
//     mid-batch, files already renamed CANNOT be restored to their prior
//     content — overwrite-by-slug already destroyed it and there is no
//     pre-rename backup in v1. The response reports `writtenPaths` vs
//     `notWritten` and the UI states that prior Root B content is not
//     recoverable (the user's VCS owns history). This module builds the
//     discard-staged-batch logic itself; the cited
//     `writeComponentFilesAndRegistry` only deletes tmp files and never
//     un-renames — there is no un-rename precedent to "extend".
//
//  Path safety: every Root B path (including manifest.json) goes through
//  `resolveSandboxPath(pickedRoot)` (lexical traversal + extension allowlist
//  + realpath containment). The realpath check is RE-RUN on each final
//  destination immediately before its `fs.rename` (`assertRealpathStable`)
//  to close the check-then-use / TOCTOU window on this untrusted root. The
//  AST endpoints keep their own `resolveWorkspacePath(__dirname)`; the root
//  parameter is NEVER shared between the two guards.
//
//  Stale-source coherence (R12): all Root A sources for the selection are
//  read from disk and their mtimes snapshotted; before any Root B write all
//  sources are re-stat'd and the sync ABORTS if any mtime advanced (a
//  concurrent AST write) — no partial / incoherent publish.
//
//  Detection-input safety is U6's concern. U5 accepts an already-resolved
//  `target` root + `componentsDir` from the request and treats them as the
//  sandbox; they are still realpath-contained here regardless.
// ============================================================================

import { promises as fs } from "node:fs"
import path from "node:path"

import * as parse5 from "parse5"

import {
  CanvasDocumentNormalizeError,
  composeNormalizedPage,
  normalizeDocument,
  type NormalizedDocument,
} from "../../utils/canvasDocumentNormalize"
import { listCanvasHtmlSlots } from "../../utils/canvasHtmlEditor"
import {
  assertRealpathStable,
  resolveSandboxPath,
  type ResolveSandboxPathErr,
} from "./resolveSandboxPath"

// --- Request / response shapes -------------------------------------------

interface SyncSourceFile {
  /** Relative path of the Root A source (for diagnostics only). */
  filePath?: unknown
  /** Full `<!doctype html>` working source read by the client. */
  sourceHtml?: unknown
  /** Client's last-known mtimeMs for this source (stale-source guard). */
  mtimeMs?: unknown
}

interface SyncComponentSelection {
  type?: "component"
  slug?: unknown
  /** Absolute Root A path to the canonical `<slug>.html` working document. */
  sourcePath?: unknown
  mtimeMs?: unknown
}

interface SyncArtboardChild {
  slug?: unknown
  sourcePath?: unknown
  mtimeMs?: unknown
}

interface SyncArtboardSelection {
  type?: "artboard"
  slug?: unknown
  sourcePath?: unknown
  mtimeMs?: unknown
  children?: unknown
}

export interface CanvasProjectSyncBody {
  /** Resolved Root B root (user-picked, already realpath-resolved by U6). */
  target?: unknown
  /** Components dir, relative to `target` (auto-detected by U6). */
  componentsDir?: unknown
  /** `"html"` (default) or `"html+tsx"`. */
  format?: unknown
  selection?: SyncComponentSelection | SyncArtboardSelection | unknown
}

interface CanvasProjectSyncOptions {
  /**
   * Repo workspace root. Used ONLY to resolve Root A source paths the client
   * sent (which it read from `projects/<id>/...`). NEVER passed to
   * `resolveSandboxPath` — that always gets the picked Root B.
   */
  workspaceRoot: string
}

export interface SyncPerFileEntry {
  path: string
  status: "written" | "not-written" | "pruned"
}

export type CanvasProjectSyncResponse =
  | {
      ok: true
      writtenPaths: string[]
      notWritten: string[]
      manifestPath: string
      perFile: SyncPerFileEntry[]
      /**
       * True only when a rename failed mid-batch. The UI must surface that
       * prior Root B content for the written files is NOT recoverable.
       */
      partialFailure?: boolean
    }
  | {
      ok: false
      status: number
      code: string
      error: string
      /** Present on mid-batch rename failure: what did / did not land. */
      writtenPaths?: string[]
      notWritten?: string[]
      partialFailure?: boolean
    }

const MANIFEST_VERSION = 1
const SANDBOX_EXTS = [".html", ".css", ".tsx", ".json"]

// --- Slug single-segment backstop ----------------------------------------
//
// Mirrors `validateSingleSegment` in canvasComponentCreate.ts. Runs BEFORE
// any Root B path join, in addition to `resolveSandboxPath`. Defense-in-depth
// — a slug is never trusted to be path-safe just because it came from the
// client.
function validateSlugSegment(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return "slug must be a non-empty string."
  }
  if (value.includes("/") || value.includes("\\")) {
    return "slug must be a single path segment (no slashes)."
  }
  if (value.includes("\0")) return "slug must not contain null bytes."
  if (value === "." || value === ".." || value.includes("..")) {
    return "slug must not contain path traversal segments."
  }
  if (value.startsWith(".")) return "slug must not start with a dot."
  if (!/^[A-Za-z0-9._-]+$/.test(value)) {
    return "slug must contain only letters, digits, dot, dash, or underscore."
  }
  return null
}

// --- HTML -> TSX (private, single-consumer, v1) ---------------------------
//
// One-way, deterministic. Operates on the NORMALIZED fragment (U9 output),
// not the document, so there is no `<html>/<head>/<style>`. Failure on any
// malformed / unsupported construct ABORTS the whole selection (never
// HTML-written-but-TSX-missing). Kept private here on purpose: single
// consumer for v1, edge rules deferred — extract to a module only if a second
// consumer appears (per the plan's Key Technical Decisions).

class HtmlToTsxError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "HtmlToTsxError"
  }
}

// Minimal, deterministic attribute-name remapping for JSX.
const ATTR_RENAME: Record<string, string> = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  readonly: "readOnly",
  maxlength: "maxLength",
  colspan: "colSpan",
  rowspan: "rowSpan",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  enctype: "encType",
  novalidate: "noValidate",
  formaction: "formAction",
  srcset: "srcSet",
  usemap: "useMap",
}

// SVG/camelCase attributes whose hyphenated form must be preserved or
// camelCased. Anything not here keeps its literal name (data-*, aria-*,
// stroke-width, etc. are valid string attributes in JSX as-is via quotes —
// but React warns on unknown-cased SVG props, so map the common ones).
const SVG_CAMEL: Record<string, string> = {
  viewbox: "viewBox",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-miterlimit": "strokeMiterlimit",
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
}

// HTML void elements — emitted self-closing in JSX.
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
])

function jsxAttrName(name: string): string {
  const lower = name.toLowerCase()
  if (ATTR_RENAME[lower]) return ATTR_RENAME[lower]
  if (SVG_CAMEL[lower]) return SVG_CAMEL[lower]
  // data-* / aria-* and unknown hyphenated names are valid JSX attribute
  // names verbatim (React passes them through). Keep deterministic: literal.
  return name
}

function escapeJsxText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/[{}]/g, (c) =>
    c === "{" ? "&#123;" : "&#125;"
  )
}

function escapeJsxAttrValue(value: string): string {
  // Attribute values become a double-quoted JSX string literal.
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
}

/**
 * Deterministically convert a NORMALIZED HTML fragment into a TSX component
 * module. CSS is referenced via a sibling import. Throws `HtmlToTsxError` on
 * any unsupported construct so the caller aborts the selection.
 */
function htmlToTsx(input: {
  fragmentHtml: string
  slug: string
  componentName: string
  hasCss: boolean
}): string {
  // Parse with parse5 (same dependency U9 uses). `parseFragment` so there is
  // no synthetic html/head/body wrapper — the input is already a normalized
  // U9 fragment.
  let frag: unknown
  try {
    frag = parse5.parseFragment(input.fragmentHtml)
  } catch (error) {
    throw new HtmlToTsxError(
      error instanceof Error ? `Fragment parse failed: ${error.message}` : "Fragment parse failed."
    )
  }

  type AnyNode = {
    nodeName: string
    tagName?: string
    value?: string
    attrs?: Array<{ name: string; value: string }>
    childNodes?: AnyNode[]
  }

  const renderNode = (node: AnyNode, depth: number): string => {
    const pad = "  ".repeat(depth)
    if (node.nodeName === "#text") {
      const text = (node.value ?? "").trim()
      if (text === "") return ""
      return `${pad}${escapeJsxText(node.value ?? "")}`
    }
    if (node.nodeName === "#comment") {
      // JSX comments are awkward; drop comments deterministically.
      return ""
    }
    const tag = node.tagName
    if (!tag || !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(tag)) {
      throw new HtmlToTsxError(`Unsupported element: ${JSON.stringify(node.nodeName)}`)
    }

    const attrParts: string[] = []
    for (const attr of node.attrs ?? []) {
      const jsxName = jsxAttrName(attr.name)
      if (attr.value === "") {
        // Boolean-ish / empty attribute. React wants {true} for true booleans
        // but an empty string for things like `class=""`. Keep deterministic:
        // empty string literal preserves semantics for all HTML attributes.
        attrParts.push(`${jsxName}=""`)
      } else {
        attrParts.push(`${jsxName}="${escapeJsxAttrValue(attr.value)}"`)
      }
    }
    const attrStr = attrParts.length > 0 ? ` ${attrParts.join(" ")}` : ""

    const elementChildren = (node.childNodes ?? []).filter(
      (c) => !(c.nodeName === "#text" && (c.value ?? "").trim() === "")
    )

    if (VOID_ELEMENTS.has(tag.toLowerCase())) {
      if (elementChildren.length > 0) {
        throw new HtmlToTsxError(`Void element <${tag}> must not have children.`)
      }
      return `${pad}<${tag}${attrStr} />`
    }

    if (elementChildren.length === 0) {
      return `${pad}<${tag}${attrStr} />`
    }

    const inner = (node.childNodes ?? [])
      .map((child) => renderNode(child, depth + 1))
      .filter((s) => s !== "")
      .join("\n")
    return `${pad}<${tag}${attrStr}>\n${inner}\n${pad}</${tag}>`
  }

  const roots = ((frag as { childNodes?: AnyNode[] }).childNodes ?? []).filter(
    (c) => !(c.nodeName === "#text" && (c.value ?? "").trim() === "")
  )
  if (roots.length === 0) {
    throw new HtmlToTsxError("Fragment has no element content to convert.")
  }

  const body =
    roots.length === 1
      ? renderNode(roots[0], 3)
      : `      <>\n${roots.map((r) => renderNode(r, 4)).join("\n")}\n      </>`

  const importLine = input.hasCss ? `import "./${input.slug}.css"\n\n` : ""
  return `${importLine}export default function ${input.componentName}() {
  return (
${body}
  )
}
`
}

function toComponentName(slug: string): string {
  const parts = slug.match(/[A-Za-z0-9]+/g) ?? ["Component"]
  const name = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")
  return /^[A-Za-z]/.test(name) ? name : `C${name}`
}

// --- Manifest -------------------------------------------------------------

interface ManifestComponentEntry {
  slug: string
  files: string[]
  slots: Array<{ name: string; kind: string; accepts?: string }>
  syncedAt: string
}

/** Map a parsed HTML slot to the stable manifest slot shape. */
function toManifestSlots(
  slots: Array<{ name: string; kind?: string; accepts?: string }>
): Array<{ name: string; kind: string; accepts?: string }> {
  return slots.map((s) => ({
    name: s.name,
    // Missing kind defaults to the registry's "container" so the manifest
    // schema stays uniform (kind is always a string).
    kind: s.kind ?? "container",
    ...(s.accepts ? { accepts: s.accepts } : {}),
  }))
}

interface ManifestPageEntry {
  slug: string
  files: string[]
  children: string[]
  syncedAt: string
}

interface SyncManifest {
  version: number
  components: ManifestComponentEntry[]
  pages: ManifestPageEntry[]
}

function emptyManifest(): SyncManifest {
  return { version: MANIFEST_VERSION, components: [], pages: [] }
}

/**
 * Read + parse the existing manifest. A missing OR parse-error manifest is
 * RECOVERED (returns a fresh empty manifest), never a crash — the published
 * Root B is overwrite-by-slug and the manifest is regenerable.
 */
async function loadManifest(manifestPath: string): Promise<SyncManifest> {
  let raw: string
  try {
    raw = await fs.readFile(manifestPath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return emptyManifest()
    // Unreadable (perm, etc.) — still recover rather than crash; the rename
    // batch will surface a real write error if the dir is truly unwritable.
    return emptyManifest()
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SyncManifest>
    return {
      version: typeof parsed.version === "number" ? parsed.version : MANIFEST_VERSION,
      components: Array.isArray(parsed.components) ? parsed.components : [],
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
    }
  } catch {
    return emptyManifest()
  }
}

function upsertComponent(manifest: SyncManifest, entry: ManifestComponentEntry): void {
  const idx = manifest.components.findIndex((c) => c.slug === entry.slug)
  if (idx === -1) manifest.components.push(entry)
  else manifest.components[idx] = entry
}

function upsertPage(manifest: SyncManifest, entry: ManifestPageEntry): void {
  const idx = manifest.pages.findIndex((p) => p.slug === entry.slug)
  if (idx === -1) manifest.pages.push(entry)
  else manifest.pages[idx] = entry
}

// --- Source reading + coherence ------------------------------------------

interface ReadSource {
  /** Relative path label for diagnostics. */
  label: string
  /** Absolute Root A path. */
  absPath: string
  /** Client's last-known mtimeMs. */
  expectedMtime: number | null
  slug: string
}

interface LoadedSource extends ReadSource {
  sourceHtml: string
  snapshotMtime: number
}

/**
 * Read every Root A source for the selection from disk and snapshot its
 * mtimeMs. Resolved against the repo workspace root (these are
 * `projects/<id>/...` files) — NOT the sandbox guard (that is Root B only).
 */
async function readAllSources(
  sources: ReadSource[]
): Promise<{ ok: true; loaded: LoadedSource[] } | { ok: false; status: number; code: string; error: string }> {
  const loaded: LoadedSource[] = []
  for (const src of sources) {
    let stat: import("node:fs").Stats
    try {
      stat = await fs.stat(src.absPath)
    } catch (error) {
      return {
        ok: false,
        status: 404,
        code: "source-missing",
        error: `Root A source not found: ${src.label} (${
          error instanceof Error ? error.message : "stat failed"
        })`,
      }
    }
    const sourceHtml = await fs.readFile(src.absPath, "utf8")
    loaded.push({ ...src, sourceHtml, snapshotMtime: stat.mtimeMs })
  }
  return { ok: true, loaded }
}

/**
 * R12 multi-file coherence: re-stat every source AFTER the read. If any
 * source's mtime advanced past the snapshot (a concurrent AST write during
 * the read window), abort BEFORE any Root B write. For a single component
 * this is one file; for an artboard it is page + every child.
 *
 * Also enforces the client's optimistic-concurrency mtime (1ms tolerance,
 * matching the AST writer): if the client's last-known mtime is stale the
 * source changed before we even read it.
 */
async function assertSourcesCoherent(
  loaded: LoadedSource[]
): Promise<{ ok: true } | { ok: false; status: number; code: string; error: string }> {
  for (const src of loaded) {
    if (src.expectedMtime !== null && Math.abs(src.snapshotMtime - src.expectedMtime) > 1) {
      return {
        ok: false,
        status: 409,
        code: "stale-source",
        error: `Root A source changed since last load: ${src.label}. Reload before syncing.`,
      }
    }
  }
  for (const src of loaded) {
    let stat: import("node:fs").Stats
    try {
      stat = await fs.stat(src.absPath)
    } catch {
      return {
        ok: false,
        status: 409,
        code: "stale-source",
        error: `Root A source vanished during sync read: ${src.label}.`,
      }
    }
    if (Math.abs(stat.mtimeMs - src.snapshotMtime) > 1) {
      return {
        ok: false,
        status: 409,
        code: "stale-source",
        error: `Root A source ${src.label} was modified during the sync read (concurrent AST write). Aborted before any write.`,
      }
    }
  }
  return { ok: true }
}

// --- Staged batch ---------------------------------------------------------

interface StagedFile {
  /** Final Root B destination (validated). */
  resolved: string
  /** Tmp path content was written to. */
  tmpPath: string
  /** Realpath of the validated sandbox root for the TOCTOU re-check. */
  validatedRealRoot: string
  /** Relative-to-target label for the response. */
  label: string
}

function sandboxErrToResponse(err: ResolveSandboxPathErr): CanvasProjectSyncResponse {
  const status = err.code === "bad-extension" ? 400 : 403
  return { ok: false, status, code: err.code, error: err.error }
}

// --- Endpoint -------------------------------------------------------------

export async function applyCanvasProjectSyncRequest(
  body: CanvasProjectSyncBody,
  options: CanvasProjectSyncOptions
): Promise<CanvasProjectSyncResponse> {
  const target = typeof body.target === "string" ? body.target.trim() : ""
  if (!target) {
    return { ok: false, status: 400, code: "bad-input", error: "target (resolved Root B root) is required." }
  }
  const componentsDirRaw = typeof body.componentsDir === "string" ? body.componentsDir.trim() : ""
  // componentsDir is relative to target; reject traversal up-front.
  if (componentsDirRaw.includes("\0") || componentsDirRaw.startsWith("/") || componentsDirRaw.includes("..")) {
    return { ok: false, status: 403, code: "bad-path", error: "componentsDir must be a safe relative path." }
  }
  const format = body.format === "html+tsx" ? "html+tsx" : "html"

  const selection = body.selection as
    | SyncComponentSelection
    | SyncArtboardSelection
    | null
    | undefined
  if (!selection || typeof selection !== "object") {
    return { ok: false, status: 400, code: "bad-input", error: "selection is required." }
  }

  const sandboxRoot = path.resolve(target, componentsDirRaw)

  // Build the Root A read list + the Root B output plan.
  const reads: ReadSource[] = []
  // outputs is filled AFTER normalization (it needs fragment/css/tsx content).

  const selType = (selection as { type?: string }).type
  let isArtboard = false
  if (selType === "artboard") isArtboard = true
  else if (selType === "component") isArtboard = false
  else if (Array.isArray((selection as SyncArtboardSelection).children)) isArtboard = true

  // --- Collect sources -----------------------------------------------------
  const resolveRootASource = (relOrAbs: unknown, label: string): string | null => {
    if (typeof relOrAbs !== "string" || relOrAbs.trim() === "" || relOrAbs.includes("\0")) return null
    const abs = path.isAbsolute(relOrAbs)
      ? path.resolve(relOrAbs)
      : path.resolve(options.workspaceRoot, relOrAbs)
    // Root A sources MUST live inside the repo workspace (not Root B). This
    // is the symmetric guard: the sync endpoint reads only repo files.
    const rel = path.relative(options.workspaceRoot, abs)
    if (rel.startsWith("..") || path.isAbsolute(rel)) return null
    return abs
  }

  interface PlannedComponent {
    slug: string
    sourceAbs: string
    expectedMtime: number | null
  }
  const plannedComponents: PlannedComponent[] = []
  let pageSlug = ""
  let pageChildrenSlugs: string[] = []

  if (!isArtboard) {
    const sel = selection as SyncComponentSelection
    const slugErr = validateSlugSegment(sel.slug)
    if (slugErr) return { ok: false, status: 403, code: "bad-path", error: slugErr }
    const slug = sel.slug as string
    const abs = resolveRootASource(sel.sourcePath, `component:${slug}`)
    if (!abs) {
      return { ok: false, status: 403, code: "bad-path", error: "component sourcePath must resolve inside the repo workspace." }
    }
    const expectedMtime = typeof sel.mtimeMs === "number" ? sel.mtimeMs : null
    reads.push({ label: `component:${slug}`, absPath: abs, expectedMtime, slug })
    plannedComponents.push({ slug, sourceAbs: abs, expectedMtime })
  } else {
    const sel = selection as SyncArtboardSelection
    const slugErr = validateSlugSegment(sel.slug)
    if (slugErr) return { ok: false, status: 403, code: "bad-path", error: `page ${slugErr}` }
    pageSlug = sel.slug as string
    const children = Array.isArray(sel.children) ? sel.children : []
    if (children.length === 0) {
      return { ok: false, status: 400, code: "bad-input", error: "artboard selection requires at least one child." }
    }
    for (const rawChild of children as SyncArtboardChild[]) {
      const childSlugErr = validateSlugSegment(rawChild?.slug)
      if (childSlugErr) {
        return { ok: false, status: 403, code: "bad-path", error: `artboard child ${childSlugErr}` }
      }
      const childSlug = rawChild.slug as string
      const abs = resolveRootASource(rawChild.sourcePath, `child:${childSlug}`)
      if (!abs) {
        return {
          ok: false,
          status: 403,
          code: "bad-path",
          error: `artboard child "${childSlug}" sourcePath must resolve inside the repo workspace (non-file-backed child?).`,
        }
      }
      const expectedMtime = typeof rawChild.mtimeMs === "number" ? rawChild.mtimeMs : null
      reads.push({ label: `child:${childSlug}`, absPath: abs, expectedMtime, slug: childSlug })
      plannedComponents.push({ slug: childSlug, sourceAbs: abs, expectedMtime })
      pageChildrenSlugs.push(childSlug)
    }
  }

  // --- Read + coherence gate (R12) ----------------------------------------
  const read = await readAllSources(reads)
  if (!read.ok) return read
  const coherent = await assertSourcesCoherent(read.loaded)
  if (!coherent.ok) return coherent

  const sourceBySlug = new Map<string, LoadedSource>()
  for (const s of read.loaded) sourceBySlug.set(s.slug, s)

  // --- Normalize (U9) ------------------------------------------------------
  const normalizedBySlug = new Map<string, NormalizedDocument>()
  try {
    for (const planned of plannedComponents) {
      const src = sourceBySlug.get(planned.slug)
      if (!src) {
        return { ok: false, status: 500, code: "internal", error: `Missing loaded source for ${planned.slug}.` }
      }
      const normalized = normalizeDocument({ sourceHtml: src.sourceHtml, slug: planned.slug })
      normalizedBySlug.set(planned.slug, normalized)
    }
  } catch (error) {
    if (error instanceof CanvasDocumentNormalizeError) {
      return {
        ok: false,
        status: 422,
        code: `normalize-${error.code}`,
        error: `Normalization failed; nothing written for this selection: ${error.message}`,
      }
    }
    return {
      ok: false,
      status: 422,
      code: "normalize-failed",
      error: error instanceof Error ? error.message : "Normalization failed.",
    }
  }

  // --- Plan Root B outputs (content first, paths validated next) ----------
  interface PlannedOutput {
    relPath: string
    content: string
    kind: "html" | "css" | "tsx" | "json"
  }
  const outputs: PlannedOutput[] = []
  // Track orphan .tsx to prune on format downgrade.
  const orphanCandidates: string[] = []

  const manifest = await loadManifest(path.join(sandboxRoot, "manifest.json"))
  const syncedAt = new Date().toISOString()

  const planComponentOutputs = (slug: string, normalized: NormalizedDocument): string[] => {
    const files: string[] = []
    const fragmentFile = `${slug}.html`
    outputs.push({
      relPath: fragmentFile,
      content: normalized.fragmentHtml.endsWith("\n") ? normalized.fragmentHtml : `${normalized.fragmentHtml}\n`,
      kind: "html",
    })
    files.push(fragmentFile)
    if (normalized.css.trim() !== "") {
      const cssFile = `${slug}.css`
      outputs.push({
        relPath: cssFile,
        content: normalized.css.endsWith("\n") ? normalized.css : `${normalized.css}\n`,
        kind: "css",
      })
      files.push(cssFile)
    }
    if (format === "html+tsx") {
      const tsxFile = `${slug}.tsx`
      let tsx: string
      try {
        tsx = htmlToTsx({
          fragmentHtml: normalized.fragmentHtml,
          slug,
          componentName: toComponentName(slug),
          hasCss: normalized.css.trim() !== "",
        })
      } catch (error) {
        throw new HtmlToTsxError(
          error instanceof Error ? error.message : `htmlToTsx failed for ${slug}.`
        )
      }
      outputs.push({ relPath: tsxFile, content: tsx, kind: "tsx" })
      files.push(tsxFile)
    } else {
      // Format downgrade: a previously synced <slug>.tsx is now an orphan.
      orphanCandidates.push(`${slug}.tsx`)
    }
    return files
  }

  try {
    if (!isArtboard) {
      const planned = plannedComponents[0]
      const normalized = normalizedBySlug.get(planned.slug)!
      const files = planComponentOutputs(planned.slug, normalized)
      const slots = toManifestSlots(
        listCanvasHtmlSlots(sourceBySlug.get(planned.slug)!.sourceHtml, {
          sourceId: "sync-slot-scan",
        })
      )
      upsertComponent(manifest, { slug: planned.slug, files, slots, syncedAt })
    } else {
      // Each child normalized independently → composed page; per-child CSS is
      // already scoped under its own [data-component="<childSlug>"] wrapper.
      const childNormalized = pageChildrenSlugs.map((s) => normalizedBySlug.get(s)!)
      const composed = composeNormalizedPage(childNormalized)

      // Publish each child's own files too (R9: page + every child).
      for (const childSlug of pageChildrenSlugs) {
        const normalized = normalizedBySlug.get(childSlug)!
        const files = planComponentOutputs(childSlug, normalized)
        const slots = toManifestSlots(
          listCanvasHtmlSlots(sourceBySlug.get(childSlug)!.sourceHtml, {
            sourceId: "sync-slot-scan",
          })
        )
        upsertComponent(manifest, { slug: childSlug, files, slots, syncedAt })
      }

      // The composed page fragment + concatenated scoped CSS.
      const pageFiles: string[] = []
      const pageHtml = `${pageSlug}.html`
      outputs.push({
        relPath: pageHtml,
        content: composed.fragmentHtml.endsWith("\n") ? composed.fragmentHtml : `${composed.fragmentHtml}\n`,
        kind: "html",
      })
      pageFiles.push(pageHtml)
      if (composed.css.trim() !== "") {
        const pageCss = `${pageSlug}.css`
        outputs.push({
          relPath: pageCss,
          content: composed.css.endsWith("\n") ? composed.css : `${composed.css}\n`,
          kind: "css",
        })
        pageFiles.push(pageCss)
      }
      if (format === "html+tsx") {
        const pageTsx = `${pageSlug}.tsx`
        let tsx: string
        try {
          tsx = htmlToTsx({
            fragmentHtml: composed.fragmentHtml,
            slug: pageSlug,
            componentName: toComponentName(pageSlug),
            hasCss: composed.css.trim() !== "",
          })
        } catch (error) {
          throw new HtmlToTsxError(
            error instanceof Error ? error.message : `htmlToTsx failed for page ${pageSlug}.`
          )
        }
        outputs.push({ relPath: pageTsx, content: tsx, kind: "tsx" })
        pageFiles.push(pageTsx)
      } else {
        orphanCandidates.push(`${pageSlug}.tsx`)
      }
      upsertPage(manifest, {
        slug: pageSlug,
        files: pageFiles,
        children: [...pageChildrenSlugs],
        syncedAt,
      })
    }
  } catch (error) {
    if (error instanceof HtmlToTsxError) {
      return {
        ok: false,
        status: 422,
        code: "tsx-failed",
        error: `TSX generation failed; nothing written for this selection: ${error.message}`,
      }
    }
    return {
      ok: false,
      status: 500,
      code: "internal",
      error: error instanceof Error ? error.message : "Output planning failed.",
    }
  }

  // Manifest is a STAGED BATCH MEMBER (.json is allowlisted) — not a
  // post-batch write. It goes through resolveSandboxPath like every file.
  outputs.push({
    relPath: "manifest.json",
    content: `${JSON.stringify(manifest, null, 2)}\n`,
    kind: "json",
  })

  // The picked `target` must exist; the `componentsDir` subfolder may not yet
  // (first sync into a fresh `src/components`). Create it now — AFTER all
  // input/normalization validation has passed, so a rejected request never
  // creates a directory — so the realpath containment check has a real
  // sandbox root to compare against. `componentsDir` was traversal-checked
  // up-front and every staged path is realpath-validated by the guard.
  try {
    await fs.access(target)
  } catch {
    return { ok: false, status: 403, code: "bad-path", error: "target root does not exist." }
  }
  try {
    await fs.mkdir(sandboxRoot, { recursive: true })
  } catch (error) {
    return {
      ok: false,
      status: 500,
      code: "mkdir-failed",
      error:
        error instanceof Error
          ? `Failed to create components directory: ${error.message}`
          : "Failed to create components directory.",
    }
  }

  // --- Stage ALL to tmp + validate ALL (true all-or-nothing) --------------
  const staged: StagedFile[] = []
  const allTmpPaths: string[] = []
  const cleanupTmp = async (): Promise<void> => {
    await Promise.all(
      allTmpPaths.map((p) => fs.rm(p, { force: true }).catch(() => undefined))
    )
  }

  for (const out of outputs) {
    const guard = await resolveSandboxPath(out.relPath, sandboxRoot, SANDBOX_EXTS)
    if (!guard.ok) {
      await cleanupTmp()
      return sandboxErrToResponse(guard)
    }
    const tmpPath = `${guard.resolved}.${process.pid}.${Date.now()}.${staged.length}.tmp`
    try {
      await fs.mkdir(path.dirname(guard.resolved), { recursive: true })
      await fs.writeFile(tmpPath, out.content, "utf8")
    } catch (error) {
      await cleanupTmp()
      return {
        ok: false,
        status: 500,
        code: "stage-failed",
        error: error instanceof Error ? error.message : `Failed to stage ${out.relPath}.`,
      }
    }
    allTmpPaths.push(tmpPath)
    staged.push({
      resolved: guard.resolved,
      tmpPath,
      validatedRealRoot: guard.validatedRealRoot,
      label: out.relPath,
    })
  }

  // --- Prune orphan .tsx on format downgrade (staged-batch aware) ----------
  // Resolve which orphans actually exist on disk; remove them AFTER the
  // rename batch only if everything renamed (an orphan removal is not part of
  // the all-or-nothing rename, but it never destroys importable code — it
  // only deletes a now-stale generated artifact).
  const orphansToPrune: string[] = []
  for (const orphanRel of orphanCandidates) {
    const guard = await resolveSandboxPath(orphanRel, sandboxRoot, SANDBOX_EXTS)
    if (!guard.ok) continue
    try {
      await fs.access(guard.resolved)
      orphansToPrune.push(guard.resolved)
    } catch {
      // not present — nothing to prune
    }
  }

  // --- Atomic rename batch -------------------------------------------------
  const writtenPaths: string[] = []
  const notWritten: string[] = []
  const perFile: SyncPerFileEntry[] = []
  let partialFailure = false

  for (let k = 0; k < staged.length; k += 1) {
    const file = staged[k]
    // Re-realpath the FINAL destination IMMEDIATELY before rename (TOCTOU).
    const drift = await assertRealpathStable(file.resolved, file.validatedRealRoot)
    if (drift) {
      // Before any rename committed → still true all-or-nothing: discard the
      // staged batch and report nothing written.
      if (writtenPaths.length === 0) {
        await cleanupTmp()
        return { ok: false, status: 403, code: drift.code, error: drift.error }
      }
      // Mid-batch: cannot un-rename prior files. Report honestly.
      partialFailure = true
      for (let j = k; j < staged.length; j += 1) {
        notWritten.push(staged[j].label)
        perFile.push({ path: staged[j].label, status: "not-written" })
      }
      break
    }
    try {
      await fs.rename(file.tmpPath, file.resolved)
      writtenPaths.push(file.label)
      perFile.push({ path: file.label, status: "written" })
    } catch (error) {
      if (writtenPaths.length === 0) {
        // Nothing renamed yet → discard staged batch, true all-or-nothing.
        await cleanupTmp()
        return {
          ok: false,
          status: 500,
          code: "write-failed",
          error: error instanceof Error ? error.message : `Failed to write ${file.label}.`,
        }
      }
      // Mid-batch rename failure. Prior Root B content already overwritten
      // for the written files and CANNOT be restored (no pre-rename backup;
      // overwrite-by-slug destroyed it). Report written vs not.
      partialFailure = true
      for (let j = k; j < staged.length; j += 1) {
        notWritten.push(staged[j].label)
        perFile.push({ path: staged[j].label, status: "not-written" })
      }
      break
    }
  }

  // Clean up any leftover tmp files for not-written entries.
  await cleanupTmp()

  if (partialFailure) {
    return {
      ok: false,
      status: 500,
      code: "partial-write",
      error:
        "A file failed to publish mid-batch. Already-written files were overwritten in place and prior content is NOT recoverable (your VCS has history).",
      writtenPaths,
      notWritten,
      partialFailure: true,
    }
  }

  // Full success → safe to prune orphan .tsx (downgrade) and reflect removal.
  for (const orphanAbs of orphansToPrune) {
    try {
      await fs.rm(orphanAbs, { force: true })
      const rel = path.relative(sandboxRoot, orphanAbs)
      perFile.push({ path: rel, status: "pruned" })
    } catch {
      // Best-effort prune; the manifest already excludes it.
    }
  }

  return {
    ok: true,
    writtenPaths,
    notWritten,
    manifestPath: path.join(sandboxRoot, "manifest.json"),
    perFile,
  }
}
