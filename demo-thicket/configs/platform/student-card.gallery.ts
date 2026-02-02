import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { StudentCard } from '@thicket/platform/StudentCard'
import { GALLERY_STUDENTS } from "@thicket/platform/gallery/mocks/galleryData"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type StudentCardProps = ComponentProps<typeof StudentCard>

/**
 * StudentCard - displays student profile with progress, activity status, and quick actions.
 * Used in teacher dashboard and student management views.
 */
const studentCardMeta: GalleryComponentMeta = {
    id: 'platform/student-card',
  sourceId: '@thicket/platform/StudentCard#StudentCard',
  status: 'archive',
}

export const studentCardGalleryEntry: GalleryEntry<StudentCardProps> = {
  name: 'StudentCard',
  importPath: studentCardMeta.sourceId.split('#')[0],
  category: 'Cards & Display',
  id: 'platform/student-card',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Active Student',
      description: 'Card for recently active student',
      props: { student: GALLERY_STUDENTS[0] },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'New Student',
      description: 'Card for newly enrolled student',
      props: { student: GALLERY_STUDENTS[1] },
      status: 'archive',
      category: 'variant',
    },
  ],
}
