import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { SortableTable } from '@thicket/platform/SortableTable'
import { GALLERY_STUDENTS } from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type SortableTableProps = ComponentProps<typeof SortableTable>

interface SimpleStudent {
  id: number
  name: string
  email: string
  overall_progress: number
  last_activity: string
}

const simpleStudents: SimpleStudent[] = GALLERY_STUDENTS.slice(0, 4).map((s) => ({
  id: s.id,
  name: s.name,
  email: s.email,
  overall_progress: s.overall_progress,
  last_activity: s.last_activity,
}))

const sortableTableMeta: GalleryComponentMeta = {
    id: 'platform/sortable-table',
  sourceId: '@thicket/platform/SortableTable#SortableTable',
  status: 'archive',
}

export const sortableTableGalleryEntry: GalleryEntry<SortableTableProps> = {
  name: 'SortableTable',
  importPath: sortableTableMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'platform/sortable-table',
  layoutSize: 'large',
  variants: [
    {
      name: 'Basic Sortable Table',
      description: 'Simple table with sortable columns',
      props: {
        data: simpleStudents.slice(0, 3),
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'email', label: 'Email', sortable: true },
          { key: 'overall_progress', label: 'Progress', sortable: true },
        ],
        rowKey: (row: SimpleStudent) => row.id,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Custom Cell Rendering',
      description: 'See StudentTableView for example with custom badge rendering',
      props: {
        data: simpleStudents,
        columns: [
          { key: 'name', label: 'Student', sortable: true },
          { key: 'overall_progress', label: 'Progress', sortable: true },
          { key: 'email', label: 'Email' },
        ],
        rowKey: (row: SimpleStudent) => row.id,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Row Actions',
      description: 'See StudentTableView for example with message button actions',
      props: {
        data: simpleStudents.slice(0, 2),
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'email', label: 'Email' },
        ],
        rowKey: (row: SimpleStudent) => row.id,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Default Sorting',
      description: 'Pre-sorted by progress (descending)',
      props: {
        data: simpleStudents,
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'overall_progress', label: 'Progress', sortable: true },
        ],
        rowKey: (row: SimpleStudent) => row.id,
        defaultSortField: 'overall_progress',
        defaultSortDirection: 'desc' as const,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'With Column Alignment',
      description: 'Different text alignment per column',
      props: {
        data: simpleStudents.slice(0, 3),
        columns: [
          { key: 'name', label: 'Name', align: 'left' as const },
          { key: 'email', label: 'Email', align: 'left' as const },
          {
            key: 'overall_progress',
            label: 'Progress',
            align: 'center' as const,
            sortable: true,
          },
        ],
        rowKey: (row: SimpleStudent) => row.id,
      },
      status: 'archive',
      category: 'layout',
    },
    {
      name: 'Empty State',
      description: 'Shows custom empty message when no data (emptyState prop accepts ReactNode)',
      props: {
        data: [],
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
        ],
        rowKey: (row: SimpleStudent) => row.id,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Loading State',
      description: 'Shows loading indicator',
      props: {
        data: simpleStudents,
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
        ],
        rowKey: (row: SimpleStudent) => row.id,
        loading: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Clickable Rows',
      description: 'Rows highlight on hover and can be clicked',
      props: {
        data: simpleStudents.slice(0, 3),
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
        ],
        rowKey: (row: SimpleStudent) => row.id,
        onRowClick: () => {},
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
