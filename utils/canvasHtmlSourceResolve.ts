/**
 * File-backed-on-create reconcile (U3).
 *
 * Native components are now file-backed at creation: `handleAddNativeComponent`
 * POSTs `/api/canvas/component/create` and then `addItem`s a node already bound
 * to the returned `filePath` + `slug`. The binding and the canvas item are
 * created together, so there is no inline-only phase.
 *
 * The create-then-rebind reconcile contract: even if the post-create rebind of
 * the *editable* binding (`sourceHtmlFilePath`) is somehow dropped, the item
 * still carries the create response's `slug` (`sourceComponentSlug`) and the
 * stable, never-cleared resolved path (`sourceComponentFilePath`). The next
 * edit MUST resolve the real file from those — never silently fall back to a
 * divergent inline copy of a file-backed component.
 *
 * Pure JS, no `fs`/`node:*` — safe for shared/client code (eslint client-import
 * guard).
 */

export interface HtmlSourceBinding {
  /** The live, user-editable file binding (can be detached via the panel). */
  sourceHtmlFilePath?: string
  /**
   * The create-response slug. Set once at file-backed-on-create and never
   * cleared by inline edits — the reconcile key.
   */
  sourceComponentSlug?: string
  /**
   * The create-response resolved repo-relative HTML path
   * (`projects/<id>/components/<Name>.html`). Set once at create and never
   * cleared by inline edits, so a dropped `sourceHtmlFilePath` rebind still
   * resolves the real file.
   */
  sourceComponentFilePath?: string
}

/**
 * Resolve the authoritative HTML source file path for an item.
 *
 * Precedence (a present file-backed identity always wins; inline is never a
 * fallback for a component that was created file-backed):
 *   1. the live editable binding (`sourceHtmlFilePath`)
 *   2. the stable create-time path (`sourceComponentFilePath`) — survives a
 *      dropped rebind
 *
 * Returns `undefined` only for genuinely non-file-backed inline nodes (no
 * slug, no create-time path), in which case the caller renders from
 * `sourceHtml` as before.
 */
export function resolveHtmlSourceFilePath(
  binding: HtmlSourceBinding
): string | undefined {
  const live = binding.sourceHtmlFilePath?.trim()
  if (live) return live
  const stable = binding.sourceComponentFilePath?.trim()
  if (stable) return stable
  return undefined
}

/**
 * True when the item was created file-backed (has a slug or a stable
 * create-time path) and therefore must never be treated as an inline-only
 * node, even if the editable binding was dropped.
 */
export function isFileBackedComponent(binding: HtmlSourceBinding): boolean {
  return Boolean(
    binding.sourceComponentSlug?.trim() || binding.sourceComponentFilePath?.trim()
  )
}
