import type { MessageThreadViewProps } from '../../platform/Messages/MessageThreadView'

import { GALLERY_MESSAGE_THREADS } from '../../platform/gallery/mocks/galleryData'
import type { GalleryComponentMeta } from '../../platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

export const messageThreadViewMeta: GalleryComponentMeta = {
  id: 'messages/message-thread-view',
  sourceId: '../../platform/Messages/MessageThreadView#MessageThreadView',
  status: 'prod',
}

export const messageThreadViewGalleryEntry: GalleryEntry<MessageThreadViewProps> = {
  id: messageThreadViewMeta.id,
  name: 'MessageThreadView',
  importPath: messageThreadViewMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'large',
  meta: messageThreadViewMeta,
  variants: [
    {
      name: 'No Thread Selected',
      description: 'Empty state when no conversation is selected',
      props: { thread: null, currentUserId: 90001, userType: 'student' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Active Conversation - Student',
      description: 'Message thread with multiple messages, student perspective',
      props: {
        thread: GALLERY_MESSAGE_THREADS[0],
        currentUserId: 90001,
        userType: 'student',
        onMessageSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Active Conversation - Teacher',
      description: 'Message thread with replies, teacher perspective',
      props: {
        thread: GALLERY_MESSAGE_THREADS[1],
        currentUserId: 90002,
        userType: 'teacher',
        onMessageSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Announcement Thread',
      description: 'Read-only announcement with multiple recipients, no reply box',
      props: {
        thread: GALLERY_MESSAGE_THREADS[2],
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Student-to-Student Conversation',
      description: 'Peer-to-peer messaging between students',
      props: {
        thread: GALLERY_MESSAGE_THREADS[3],
        currentUserId: 90001,
        userType: 'student',
        onMessageSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Single Message Thread',
      description: 'Thread with just one message',
      props: {
        thread: GALLERY_MESSAGE_THREADS[4],
        currentUserId: 90003,
        userType: 'student',
        onMessageSent: () => {},
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
