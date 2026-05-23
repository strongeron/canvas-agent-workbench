/**
 * Read-only AST inspector for the canvas property panel (U3).
 *
 * Given a TSX source string and a `canvasId` produced by U1's element-id
 * Vite plugin, returns a structured description of the matching JSX
 * element: tag name, attributes (with type-classification), text children,
 * and whether the element fits the v1 TSX-mutation subset.
 *
 * The reader does not mutate the source. It exists so the property panel
 * can show fields without taking on the AST-mutation surface, which is U4's
 * concern.
 *
 * Used by U3 of docs/plans/2026-04-28-001-feat-canvas-figma-like-editing-plan.md.
 */

import * as ts from "typescript"

import { findNodeByCanvasId, parseTsxSource } from "./canvasAstPath"

export type AstAttributeKind =
  | "literal-string"
  | "literal-number"
  | "literal-boolean"
  | "expression"
  | "spread"
  | "shorthand"

export interface AstAttributeInfo {
  /** Attribute name as it appears in JSX (e.g. `className`, `onClick`). */
  name: string
  kind: AstAttributeKind
  /**
   * Display value:
   * - literal-string: the string contents (no quotes)
   * - literal-number: the literal text (e.g. "42")
   * - literal-boolean: "true" or "false"
   * - expression: the source text of the expression (e.g. `cn("p-4")`)
   * - spread: the spread source text (e.g. `...rest`)
   * - shorthand: the boolean-implied attribute (e.g. just `disabled`)
   */
  value: string
  /**
   * Raw source text including quotes/braces, useful for editor previews.
   */
  rawValue: string
  /**
   * Whether U4 can mutate this attribute via simple AST replacement. False
   * for `expression` and `spread` kinds in v1 — those need source-only mode.
   */
  editableInV1: boolean
  reasonNotEditable?: string
}

export interface AstNodeInfo {
  canvasId: string
  /** Tag as written in source (`button`, `Button`, `svg:circle`). */
  tag: string
  /** Lowercase first letter → host element (browser tag); else custom component. */
  isHostElement: boolean
  attributes: AstAttributeInfo[]
  /**
   * Concatenated literal text children when the element has only text
   * children (e.g. `<button>Hi</button>` → `"Hi"`). Empty when there are
   * any non-text children or computed expressions.
   */
  textChildren: string
  /** True if the element has any nested JSX or expression children. */
  hasNonTextChildren: boolean
  /** Direct element child count when known. Used by HTML slot composition controls. */
  childElementCount?: number
  /** Whether the element fits the v1 TSX-mutation subset for U4. */
  editableInV1: boolean
  reasonNotEditable?: string
}

export type AstReadResult = AstNodeInfo | { error: string }

export function readCanvasAstNode(
  tsxSource: string,
  canvasId: string,
  options: { sourceId: string }
): AstReadResult {
  if (typeof tsxSource !== "string") {
    return { error: "tsxSource must be a string" }
  }
  if (!options || typeof options.sourceId !== "string" || !options.sourceId) {
    return { error: "sourceId is required" }
  }
  if (typeof canvasId !== "string" || !canvasId.includes(":")) {
    return { error: "Malformed canvasId — expected `<sourceIdHash>:<astPath>`" }
  }

  let sourceFile: ts.SourceFile
  try {
    sourceFile = parseTsxSource(tsxSource)
  } catch (error) {
    return { error: `Failed to parse TSX: ${(error as Error).message}` }
  }

  // ts.createSourceFile never throws; it returns a SourceFile with parse
  // diagnostics attached. For the reader's contract, surface a parse error
  // when the source doesn't contain at least one statement so callers know
  // the input was unparseable.
  if (sourceFile.statements.length === 0) {
    return { error: "Source contains no statements (failed to parse)" }
  }

  const node = findNodeByCanvasId(sourceFile, canvasId, options)
  if (!node) {
    return { error: "canvasId did not resolve to a node — sourceId mismatch or stale id after edit" }
  }

  // The canvasId points at the JsxOpeningElement / JsxSelfClosingElement.
  // For host element / custom component classification we just need the
  // tagName.
  if (!ts.isJsxOpeningElement(node) && !ts.isJsxSelfClosingElement(node)) {
    return { error: "Resolved node is not a JSX element (tagName host/component)" }
  }

  const tag = node.tagName.getText(sourceFile)
  const firstChar = tag[0] ?? ""
  // Host element: lowercase first letter (e.g. button, div). Namespaced
  // (svg:circle) is also host. Custom component: uppercase or has dot
  // (e.g. Button, Foo.Bar).
  const isHostElement = /^[a-z]/.test(firstChar)

  const attributes: AstAttributeInfo[] = []
  for (const attr of node.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attr)) {
      const exprText = attr.expression.getText(sourceFile)
      attributes.push({
        name: "...",
        kind: "spread",
        value: `...${exprText}`,
        rawValue: attr.getText(sourceFile),
        editableInV1: false,
        reasonNotEditable: "Spread attributes are not v1-editable",
      })
      continue
    }
    if (!ts.isJsxAttribute(attr)) continue
    const name = attr.name.getText(sourceFile)
    if (name === "data-canvas-id") continue // injected attribute; hide from UI

    const initializer = attr.initializer
    if (!initializer) {
      attributes.push({
        name,
        kind: "shorthand",
        value: "true",
        rawValue: "",
        editableInV1: true,
      })
      continue
    }
    if (ts.isStringLiteral(initializer)) {
      attributes.push({
        name,
        kind: "literal-string",
        value: initializer.text,
        rawValue: initializer.getText(sourceFile),
        editableInV1: true,
      })
      continue
    }
    if (ts.isJsxExpression(initializer) && initializer.expression) {
      const expr = initializer.expression
      if (ts.isNumericLiteral(expr)) {
        attributes.push({
          name,
          kind: "literal-number",
          value: expr.getText(sourceFile),
          rawValue: initializer.getText(sourceFile),
          editableInV1: true,
        })
        continue
      }
      if (expr.kind === ts.SyntaxKind.TrueKeyword || expr.kind === ts.SyntaxKind.FalseKeyword) {
        attributes.push({
          name,
          kind: "literal-boolean",
          value: expr.kind === ts.SyntaxKind.TrueKeyword ? "true" : "false",
          rawValue: initializer.getText(sourceFile),
          editableInV1: true,
        })
        continue
      }
      // Anything else is a computed expression — call, identifier, template,
      // arrow function, etc. Read-only in v1.
      attributes.push({
        name,
        kind: "expression",
        value: expr.getText(sourceFile),
        rawValue: initializer.getText(sourceFile),
        editableInV1: false,
        reasonNotEditable: "Computed expression — open in source mode to edit",
      })
      continue
    }
  }

  // For self-closing elements there are no children. For opening elements,
  // the parent JsxElement holds the children. We inspect the parent only if
  // we resolved to a JsxOpeningElement.
  let textChildren = ""
  let hasNonTextChildren = false
  if (ts.isJsxOpeningElement(node) && node.parent && ts.isJsxElement(node.parent)) {
    const elementChildren = node.parent.children
    for (const child of elementChildren) {
      if (ts.isJsxText(child)) {
        const text = child.text
        if (text.trim() !== "") textChildren += text
      } else {
        hasNonTextChildren = true
      }
    }
    textChildren = textChildren.trim()
    if (hasNonTextChildren) textChildren = ""
  }

  // V1 editability gate for the element as a whole: must have only
  // string/number/boolean literal attributes plus optional spread, and
  // must have only text children (or no children). cn()-style className
  // kicks the element out for v1 attribute editing — but we still report
  // the node so the panel can show source-only mode.
  const hasNonLiteralExpression = attributes.some(
    (attr) => attr.kind === "expression" && attr.name !== "data-canvas-id"
  )
  const hasSpread = attributes.some((attr) => attr.kind === "spread")
  const editableInV1 = !hasNonLiteralExpression && !hasSpread && !hasNonTextChildren
  let reasonNotEditable: string | undefined
  if (hasNonLiteralExpression) {
    reasonNotEditable = "Element has computed-expression attributes; open source mode"
  } else if (hasSpread) {
    reasonNotEditable = "Element has spread attributes; open source mode"
  } else if (hasNonTextChildren) {
    reasonNotEditable = "Element has nested JSX or expression children"
  }

  return {
    canvasId,
    tag,
    isHostElement,
    attributes,
    textChildren,
    hasNonTextChildren,
    editableInV1,
    reasonNotEditable,
  }
}
