import type { UserAvatarProps } from "@thicket/components/ui/user-avatar"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

const userAvatarMeta: GalleryComponentMeta = {
    id: 'ui/user-avatar',
  sourceId: '@thicket/components/ui/user-avatar#UserAvatarProps',
  status: 'archive',
}

export const userAvatarGalleryEntry: GalleryEntry<UserAvatarProps> = {
  name: 'UserAvatar',
  importPath: userAvatarMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/user-avatar',
  layoutSize: 'small',
  variants: [
    {
      name: 'With Image',
      description: 'Avatar with user image',
      props: { name: 'Sarah Chen', avatarUrl: '/images/placeholder.svg' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Initials Only',
      description: 'Avatar showing user initials',
      props: { name: 'John Doe' },
      status: 'archive',
      category: 'variant',
    },
  ],
}
