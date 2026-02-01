import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '../registry/types'

import type { StudentCard } from '@/platform/components/StudentCard'
import { GALLERY_STUDENTS } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

type StudentCardProps = ComponentProps<typeof StudentCard>

/**
 * StudentCard - displays student profile with progress, activity status, and quick actions.
 * Used in teacher dashboard and student management views.
 */
const studentCardMeta: GalleryComponentMeta = {
    id: 'platform/student-card',
  sourceId: '@/platform/components/StudentCard#StudentCard',
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
