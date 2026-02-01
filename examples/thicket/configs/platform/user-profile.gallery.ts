import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '../registry/types'

import type { UserProfile } from '@/platform/components/UserProfile'
import { GALLERY_INSTRUCTORS, GALLERY_STUDENTS } from "../mocks/galleryData"
import type { GalleryEntry } from "../registry/types"

type UserProfileProps = ComponentProps<typeof UserProfile>

/**
 * UserProfile - displays user avatar, name, role, and settings link.
 * Used in sidebar navigation for both teacher and student views.
 */
const userProfileMeta: GalleryComponentMeta = {
    id: 'platform/user-profile',
  sourceId: '@/platform/components/UserProfile#UserProfile',
  status: 'archive',
}

export const userProfileGalleryEntry: GalleryEntry<UserProfileProps> = {
  name: 'UserProfile',
  importPath: userProfileMeta.sourceId.split('#')[0],
  category: 'Navigation & Controls',
  id: 'platform/user-profile',
  layoutSize: 'large',
  variants: [
    {
      name: 'Teacher Profile',
      description: 'Profile display for instructor',
      props: {
        user: {
          id: 1,
          name: GALLERY_INSTRUCTORS[0].name,
          email: 'instructor@example.com',
          avatar_url: GALLERY_INSTRUCTORS[0].avatar_url,
          role: 'teacher' as const
        }
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Student Profile',
      description: 'Profile display for student',
      props: {
        user: {
          id: 2,
          name: GALLERY_STUDENTS[0].name,
          email: GALLERY_STUDENTS[0].email,
          avatar_url: GALLERY_STUDENTS[0].avatar_url,
          role: 'student' as const
        }
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
