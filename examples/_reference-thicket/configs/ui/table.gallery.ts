import type { TableProps } from "@/components/ui/table"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const tableMeta: GalleryComponentMeta = {
    id: 'ui/table',
  sourceId: '@/components/ui/table#TableProps',
  status: 'archive',
}

export const tableGalleryEntry: GalleryEntry<TableProps> = {
  name: 'Table',
  importPath: tableMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/table',
  layoutSize: 'large',
  variants: [
    {
      name: 'Basic Table',
      description: 'Simple table with headers and rows - see StudentTableView or TeacherCourseTable for full examples',
      props: { __skipRender: true },
      status: 'archive',
      category: 'variant',
    },
  ],
}
