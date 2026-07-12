/**
 * Typed surface for the shared operations core (FOX2-74). Every export is
 * declared permissively: the shapes are owned by the .mjs and its own test
 * suite; consumers that need precision (the reducer delegation in
 * useCanvasState) cast at the call site. This file exists so TypeScript
 * files can import the module statically without @ts-ignore.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export declare const DEFAULT_ARTBOARD_LAYOUT: any
export declare const DEFAULT_ARTBOARD_POSITION: any
export declare const DEFAULT_ARTBOARD_SIZE: any
export declare const DEFAULT_EXPORT_FORMAT: any
export declare const DEFAULT_HTML_ITEM_SIZE: any
export declare const DEFAULT_MCP_APP_ITEM_SIZE: any
export declare const EXPORT_FORMATS: any
export declare const GROUP_COLORS: any
export declare const applyCanvasRemoteOperationToState: any
export declare const applyCanvasThemeOperationToSnapshot: any
export declare const buildDuplicateItemsResult: any
export declare const buildMoveItemsIntoArtboardResult: any
export declare const buildNativeComponentShellCreateInput: any
export declare const buildReorderLayerResult: any
export declare const buildUpdateSectionSizingResult: any
export declare const buildWrapItemsInSectionResult: any
export declare const collectCanvasCascadeDeleteIds: any
export declare const createArtboardItem: any
export declare const createCanvasGroup: any
export declare const createCanvasItemId: any
export declare const createCaptureEmbedSnapshotsOperation: any
export declare const createClearCanvasOperation: any
export declare const createConvertMermaidToExcalidrawOperation: any
export declare const createCreateCanvasThemeOperation: any
export declare const createCreateGroupOperation: any
export declare const createCreateItemOperation: any
export declare const createCreateItemsOperation: any
export declare const createDeleteCanvasThemeOperation: any
export declare const createDeleteGroupOperation: any
export declare const createDeleteItemsOperation: any
export declare const createFocusItemsOperation: any
export declare const createHtmlCanvasItem: any
export declare const createMcpAppCanvasItem: any
export declare const createNativeComponentShellItem: any
export declare const createPrimitiveCanvasItem: any
export declare const createRedoCanvasChangeOperation: any
export declare const createRedoSourceMutationOperation: any
export declare const createSelectItemsOperation: any
export declare const createSetActiveThemeOperation: any
export declare const createSetCanvasToolOperation: any
export declare const createSetViewportOperation: any
export declare const createUndoCanvasChangeOperation: any
export declare const createUndoSourceMutationOperation: any
export declare const createUpdateCanvasThemeVarOperation: any
export declare const createUpdateGroupOperation: any
export declare const createUpdateItemOperation: any
export declare const createUpdateItemsOperation: any
export declare const deriveCanvasNextZIndex: any
export declare const exportCanvasBoard: any
export declare const normalizeArtboardLayout: any
export declare const normalizeBoolean: any
export declare const normalizeCanvasStateSnapshot: any
export declare const normalizeComponentName: any
export declare const normalizeIdList: any
export declare const normalizePosition: any
export declare const normalizeSize: any
export declare const normalizeString: any
export declare const resolvePrimitiveImport: any
export declare const resolvePrimitiveVariantIndex: any
export declare const resolveSyncSelectionFromState: any
export declare const resolveSyncToProjectTarget: any
