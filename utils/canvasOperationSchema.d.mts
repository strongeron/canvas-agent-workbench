export declare const KNOWN_CANVAS_ITEM_TYPES: readonly string[]

export declare function mintCanvasItemId(): string

export type CanvasOperationValidation<T = unknown> =
  | { ok: true; operation: T }
  | { ok: false; error: string }

export declare function validateCanvasAgentOperation<T = unknown>(
  operation: T
): CanvasOperationValidation<T>

export declare function isRenderableCanvasItem(item: unknown): boolean
