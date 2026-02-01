import type { GalleryEntry } from '../registry/types'
import type { GalleryComponentMeta } from '../registry/types'

interface MessageTypeToggleProps {
  value: 'individual' | 'announcement'
  onChange: (value: 'individual' | 'announcement') => void
  disabled?: boolean
}

const messageTypeToggleMeta: GalleryComponentMeta = {
    id: 'messages/message-type-toggle',
  sourceId: '@/platform/components/MessageComposer/MessageTypeToggle#MessageTypeToggle',
  status: 'archive',
}

export const messageTypeToggleGalleryEntry: GalleryEntry<MessageTypeToggleProps> = {
  id: 'messages/message-type-toggle',
  name: 'MessageTypeToggle',
  importPath: messageTypeToggleMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Individual Selected',
      description: 'Toggle with individual message mode selected',
      props: {
        value: 'individual',
        onChange: () => console.log('Changed'),
        disabled: false,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Announcement Selected',
      description: 'Toggle with announcement mode selected',
      props: {
        value: 'announcement',
        onChange: () => console.log('Changed'),
        disabled: false,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled State',
      description: 'Toggle in disabled state (non-interactive)',
      props: {
        value: 'individual',
        onChange: () => console.log('Changed'),
        disabled: true,
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
