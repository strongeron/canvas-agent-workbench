export type ComponentStatus = "prod" | "wip" | "archive"

export type GalleryComponentMeta = {
  id: string
  sourceId: string
  status: ComponentStatus
}

