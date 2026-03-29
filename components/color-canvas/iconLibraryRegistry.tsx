import type { ReactNode, SVGProps } from "react"
import { Columns2, Grid2x2, Move, Palette, Search, Type as TypeIcon } from "lucide-react"

import type { DesignSystemIconLibraryId } from "../../projects/design-system-foundation/designSystemApi"

export type DesignSystemIconKey = "type" | "grid" | "split" | "accent" | "action" | "search"

type CanvasIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
}

type CanvasIconComponent = (props: CanvasIconProps) => ReactNode

interface IconLibraryDefinition {
  id: DesignSystemIconLibraryId
  label: string
  description: string
  icons: Record<DesignSystemIconKey, CanvasIconComponent>
}

function createBaseSvg(props: CanvasIconProps, children: ReactNode) {
  const { size = 24, strokeWidth = 1.75, className, ...rest } = props
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  )
}

const CanvasTypeIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <path d="M5 6h14" />
      <path d="M12 6v12" />
      <path d="M8 18h8" />
    </>
  ))

const CanvasGridIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ))

const CanvasSplitIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <rect x="4" y="5" width="7" height="14" rx="2" />
      <rect x="13" y="5" width="7" height="14" rx="2" />
      <path d="M12 5v14" />
    </>
  ))

const CanvasAccentIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <path d="M7 14 14 7" />
      <path d="m13 6 5 5" />
      <path d="m6 15 3 3" />
      <path d="M4 20h6" />
    </>
  ))

const CanvasActionIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <path d="m6 18 12-12" />
      <path d="M8 6h10v10" />
      <path d="m6 11 7 7" />
    </>
  ))

const CanvasSearchIcon: CanvasIconComponent = (props) =>
  createBaseSvg(props, (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 4 4" />
      <path d="M8.5 10.5h4" />
    </>
  ))

export const DESIGN_SYSTEM_ICON_KEYS: DesignSystemIconKey[] = [
  "type",
  "grid",
  "split",
  "accent",
  "action",
  "search",
]

export const DESIGN_SYSTEM_ICON_LIBRARIES: IconLibraryDefinition[] = [
  {
    id: "lucide",
    label: "Lucide",
    description: "Open-source outline icon set with consistent strokes.",
    icons: {
      type: TypeIcon,
      grid: Grid2x2,
      split: Columns2,
      accent: Palette,
      action: Move,
      search: Search,
    },
  },
  {
    id: "canvas-symbols",
    label: "Canvas Symbols",
    description: "Internal geometric symbol set for denser UI previews.",
    icons: {
      type: CanvasTypeIcon,
      grid: CanvasGridIcon,
      split: CanvasSplitIcon,
      accent: CanvasAccentIcon,
      action: CanvasActionIcon,
      search: CanvasSearchIcon,
    },
  },
]

export function getDesignSystemIconLibrary(
  id?: string
): IconLibraryDefinition {
  return (
    DESIGN_SYSTEM_ICON_LIBRARIES.find((library) => library.id === id) ??
    DESIGN_SYSTEM_ICON_LIBRARIES[0]
  )
}

export function getDesignSystemIconLibraryLabel(id?: string) {
  return getDesignSystemIconLibrary(id).label
}

export function getDesignSystemIcon(
  libraryId: string | undefined,
  iconKey: DesignSystemIconKey
) {
  return getDesignSystemIconLibrary(libraryId).icons[iconKey]
}
