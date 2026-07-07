import type { ChangeEventHandler, ComponentProps, RefObject } from "react"

import type { NativeComponentTemplate } from "../../utils/canvasNativeComponentShell"
import type { CanvasRegistryPrimitive } from "../../utils/canvasRegistry"
import type {
  CanvasFileActionModalState,
  CanvasFileDeleteModalState,
} from "../../hooks/useCanvasFilePersistence"
import { CANVAS_SHORTCUTS } from "../../hooks/useCanvasShortcuts"
import { CanvasAddMcpAppDialog } from "./CanvasAddMcpAppDialog"
import {
  CanvasArtboardAddMenu,
  type CanvasArtboardAddAssetKind,
} from "./CanvasArtboardAddMenu"
import { CanvasComponentPasteDialog } from "./CanvasComponentPasteDialog"
import { CanvasHelpOverlay } from "./CanvasHelpOverlay"
import { CanvasNativeComponentDialog } from "./CanvasNativeComponentDialog"
import { CanvasFileActionDialog, CanvasFileDeleteDialog } from "./CanvasFileDialogs"

interface CanvasDialogsProps {
  /** Shared registry project id (component-paste + artboard add menu). */
  projectId: string

  // Component paste
  componentPasteVisible: boolean
  onComponentPasteCreated: ComponentProps<typeof CanvasComponentPasteDialog>["onCreated"]
  onCloseComponentPaste: () => void

  // Native component
  nativeComponentOpen: boolean
  nativeComponentArtboardName: string | null
  nativeComponentTemplate: NativeComponentTemplate
  nativeComponentTitle: string
  onCloseNativeComponent: () => void
  onCreateNativeComponent: ComponentProps<typeof CanvasNativeComponentDialog>["onCreate"]

  // MCP app
  mcpAppOpen: boolean
  onCloseMcpApp: () => void
  onCreateMcpApp: ComponentProps<typeof CanvasAddMcpAppDialog>["onCreate"]

  // Artboard add menu (FOX2-59 method 4)
  artboardAddMenu: { artboardId: string; x: number; y: number } | null
  artboardAddMenuName: string
  onCloseArtboardAddMenu: () => void
  onAddPrimitive: (primitive: CanvasRegistryPrimitive) => void
  onAddAsset: (kind: CanvasArtboardAddAssetKind) => void

  // Hidden artboard-media file input
  mediaInputRef: RefObject<HTMLInputElement | null>
  onMediaInputChange: ChangeEventHandler<HTMLInputElement>

  // Canvas-file action / delete modals
  fileActionModal: CanvasFileActionModalState | null
  fileActionError: string | null
  fileActionBusy: boolean
  onFileActionTitleChange: (value: string) => void
  onFileActionFolderChange: (value: string) => void
  onCloseFileAction: () => void
  onSubmitFileAction: () => void
  fileDeleteModal: CanvasFileDeleteModalState | null
  fileDeleteError: string | null
  fileDeleteBusy: boolean
  onCloseFileDelete: () => void
  onConfirmFileDelete: () => void

  // Help overlay
  showHelp: boolean
  onCloseHelp: () => void
}

/**
 * All modal/menu mounts for a canvas tab, grouped so CanvasTab renders them
 * through one child (FOX2-62 Scale-1 PR 5). Every entry is a full-viewport
 * overlay or a portal, so DOM position is immaterial — the container-anchored
 * history toast stays in CanvasTab.
 */
export function CanvasDialogs({
  projectId,
  componentPasteVisible,
  onComponentPasteCreated,
  onCloseComponentPaste,
  nativeComponentOpen,
  nativeComponentArtboardName,
  nativeComponentTemplate,
  nativeComponentTitle,
  onCloseNativeComponent,
  onCreateNativeComponent,
  mcpAppOpen,
  onCloseMcpApp,
  onCreateMcpApp,
  artboardAddMenu,
  artboardAddMenuName,
  onCloseArtboardAddMenu,
  onAddPrimitive,
  onAddAsset,
  mediaInputRef,
  onMediaInputChange,
  fileActionModal,
  fileActionError,
  fileActionBusy,
  onFileActionTitleChange,
  onFileActionFolderChange,
  onCloseFileAction,
  onSubmitFileAction,
  fileDeleteModal,
  fileDeleteError,
  fileDeleteBusy,
  onCloseFileDelete,
  onConfirmFileDelete,
  showHelp,
  onCloseHelp,
}: CanvasDialogsProps) {
  return (
    <>
      {componentPasteVisible && (
        <CanvasComponentPasteDialog
          projectId={projectId}
          onCreated={onComponentPasteCreated}
          onClose={onCloseComponentPaste}
        />
      )}

      <CanvasNativeComponentDialog
        open={nativeComponentOpen}
        artboardName={nativeComponentArtboardName}
        initialTemplate={nativeComponentTemplate}
        initialTitle={nativeComponentTitle}
        onClose={onCloseNativeComponent}
        onCreate={onCreateNativeComponent}
      />

      <CanvasAddMcpAppDialog open={mcpAppOpen} onClose={onCloseMcpApp} onCreate={onCreateMcpApp} />

      {artboardAddMenu && (
        <CanvasArtboardAddMenu
          position={artboardAddMenu}
          artboardName={artboardAddMenuName}
          projectId={projectId}
          onClose={onCloseArtboardAddMenu}
          onAddPrimitive={onAddPrimitive}
          onAddAsset={onAddAsset}
        />
      )}

      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={onMediaInputChange}
      />

      <CanvasFileActionDialog
        open={fileActionModal !== null}
        mode={fileActionModal?.mode ?? "create"}
        surfaceLabel="Canvas"
        titleValue={fileActionModal?.title ?? ""}
        folderValue={fileActionModal?.folder ?? ""}
        error={fileActionError}
        busy={fileActionBusy}
        onTitleChange={onFileActionTitleChange}
        onFolderChange={onFileActionFolderChange}
        onClose={onCloseFileAction}
        onSubmit={onSubmitFileAction}
      />

      <CanvasFileDeleteDialog
        open={fileDeleteModal !== null}
        title={fileDeleteModal?.title ?? ""}
        path={fileDeleteModal?.path ?? ""}
        error={fileDeleteError}
        busy={fileDeleteBusy}
        onClose={onCloseFileDelete}
        onConfirm={onConfirmFileDelete}
      />

      {showHelp && <CanvasHelpOverlay shortcuts={CANVAS_SHORTCUTS} onClose={onCloseHelp} />}
    </>
  )
}
