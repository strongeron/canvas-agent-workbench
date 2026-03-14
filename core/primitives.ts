import type { ComponentStatus, GalleryEntry, PrimitiveMeta } from "./types"
import type { ComponentVariant, ComponentLayoutSize, CanvasEntryMeta } from "./types"

export interface PrimitiveDefinition<TProps = Record<string, unknown>> {
  id: string
  name: string
  description?: string
  category?: string
  importPath: string
  exportName: string
  layoutSize?: ComponentLayoutSize
  canvas?: CanvasEntryMeta
  primitive: Omit<PrimitiveMeta, "primitiveId"> & { primitiveId?: string }
  variants: ComponentVariant<TProps>[]
  allowOverflow?: boolean
  status?: ComponentStatus
}

export function createPrimitiveGalleryEntry<TProps = Record<string, unknown>>({
  id,
  name,
  description,
  category = "Design System",
  importPath,
  exportName,
  layoutSize = "medium",
  canvas,
  primitive,
  variants,
  allowOverflow,
  status = "prod",
}: PrimitiveDefinition<TProps>): GalleryEntry<TProps> {
  return {
    id,
    name,
    description,
    category,
    importPath,
    layoutSize,
    canvas,
    primitive: {
      primitiveId: primitive.primitiveId ?? id,
      family: primitive.family,
      level: primitive.level,
      htmlTag: primitive.htmlTag,
      exportable: primitive.exportable,
      tokenUsage: primitive.tokenUsage,
    },
    allowOverflow,
    meta: {
      id,
      sourceId: `${importPath}#${exportName}`,
      status,
    },
    variants,
  }
}
