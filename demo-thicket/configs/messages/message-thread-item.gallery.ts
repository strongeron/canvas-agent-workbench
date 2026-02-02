import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { MessageThreadItem } from '@thicket/platform/Messages/MessageThreadItem'
import {
  GALLERY_THREAD_ANNOUNCEMENT,
  GALLERY_THREAD_ANNOUNCEMENT_UNREAD,
  GALLERY_THREAD_DIRECT,
  GALLERY_THREAD_LONG_PREVIEW,
  GALLERY_THREAD_LONG_SUBJECT,
  GALLERY_THREAD_STUDENT_READ,
  GALLERY_THREAD_STUDENT_UNREAD,
  GALLERY_THREAD_TEACHER,
} from '@thicket/platform/gallery/mocks/galleryData'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'

type MessageThreadItemProps = ComponentProps<typeof MessageThreadItem>

const messageThreadItemMeta: GalleryComponentMeta = {
    id: 'messages/message-thread-item',
  sourceId: '@thicket/platform/Messages/MessageThreadItem#MessageThreadItem',
  status: 'archive',
}

export const messageThreadItemGalleryEntry: GalleryEntry<MessageThreadItemProps> = {
  id: 'messages/message-thread-item',
  name: 'MessageThreadItem',
  importPath: messageThreadItemMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Unread Message - Student (Teacher View)',
      description: 'Bold typography for name, subject, and preview showing unread state',
      props: {
        thread: GALLERY_THREAD_STUDENT_UNREAD,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Read Message - Student (Teacher View)',
      description: 'Regular typography indicating message has been read',
      props: {
        thread: GALLERY_THREAD_STUDENT_READ,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Unread Message from Teacher (Student View)',
      description: 'Shows instructor badge and bold text for unread message',
      props: {
        thread: GALLERY_THREAD_TEACHER,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90003,
        userType: 'student',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Read Message from Teacher (Student View)',
      description: 'Teacher with instructor badge, regular typography',
      props: {
        thread: { ...GALLERY_THREAD_TEACHER, unread_count: 0 },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90003,
        userType: 'student',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Selected Thread - Unread',
      description: 'Brand background with bold text for active unread thread',
      props: {
        thread: GALLERY_THREAD_STUDENT_UNREAD,
        isSelected: true,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Selected Thread - Read',
      description: 'Brand background with regular text for active read thread',
      props: {
        thread: GALLERY_THREAD_STUDENT_READ,
        isSelected: true,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Announcement - Unread (Teacher View)',
      description: 'Megaphone icon, announcement badge, student count, bold typography',
      props: {
        thread: GALLERY_THREAD_ANNOUNCEMENT,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Announcement - Unread (Student View)',
      description: 'Course announcement from student perspective with unread indicator',
      props: {
        thread: GALLERY_THREAD_ANNOUNCEMENT_UNREAD,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'student',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Announcement - Read (Teacher View)',
      description: 'Read announcement with regular typography',
      props: {
        thread: { ...GALLERY_THREAD_ANNOUNCEMENT, unread_count: 0 },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Direct Message (No Course)',
      description: 'Shows "Direct Message" badge instead of course name',
      props: {
        thread: GALLERY_THREAD_DIRECT,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90003,
        userType: 'student',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Message with Course Badge',
      description: 'Shows course name badge below message preview',
      props: {
        thread: GALLERY_THREAD_STUDENT_READ,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Long Subject Line',
      description: 'Subject truncates with ellipsis when too long',
      props: {
        thread: GALLERY_THREAD_LONG_SUBJECT,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'student',
      },
      status: 'archive',
      category: 'layout',
    },
    {
      name: 'Long Message Preview',
      description: 'Message preview limited to 2 lines with line-clamp',
      props: {
        thread: GALLERY_THREAD_LONG_PREVIEW,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90002,
        userType: 'student',
      },
      status: 'archive',
      category: 'layout',
    },
    {
      name: 'Single Unread Count',
      description: 'Thread with unread_count: 1 shows bold typography',
      props: {
        thread: { ...GALLERY_THREAD_STUDENT_READ, unread_count: 1 },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Multiple Unread Count',
      description: 'Thread with unread_count: 5 shows bold typography',
      props: {
        thread: { ...GALLERY_THREAD_STUDENT_READ, unread_count: 5 },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Recent Message (Minutes Ago)',
      description: 'Timestamp shows relative time (minutes ago)',
      props: {
        thread: {
          ...GALLERY_THREAD_STUDENT_UNREAD,
          last_message_timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Older Message (Days Ago)',
      description: 'Timestamp shows relative time (days ago)',
      props: {
        thread: {
          ...GALLERY_THREAD_STUDENT_READ,
          last_message_timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Announcement with Large Student Count',
      description: 'Shows announcement with 234 students badge',
      props: {
        thread: GALLERY_THREAD_ANNOUNCEMENT,
        isSelected: false,
        onSelect: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
