// @ts-nocheck
import type { MessageThreadListProps } from '@/platform/components/Messages/MessageThreadList'

import {
  GALLERY_MESSAGE_THREADS,
  GALLERY_THREAD_ANNOUNCEMENT,
  GALLERY_THREAD_ANNOUNCEMENT_UNREAD,
  GALLERY_THREAD_STUDENT_READ,
  GALLERY_THREAD_STUDENT_UNREAD,
  GALLERY_THREAD_TEACHER,
} from '../mocks/galleryData'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from '../registry/types'

export const messageThreadListMeta: GalleryComponentMeta = {
  id: 'messages/message-thread-list',
  sourceId: '@/platform/components/Messages/MessageThreadList#MessageThreadList',
  status: 'prod',
}

export const messageThreadListGalleryEntry: GalleryEntry<MessageThreadListProps> = {
  id: messageThreadListMeta.id,
  name: 'MessageThreadList',
  importPath: messageThreadListMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'large',
  meta: messageThreadListMeta,
  variants: [
    {
      name: 'Empty State',
      description: 'No message threads available',
      props: {
        threads: [],
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'student',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Multiple Threads - Student View',
      description: 'List of message threads from student perspective with unread counts',
      props: {
        threads: GALLERY_MESSAGE_THREADS,
        selectedThreadId: 90001,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'student',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Multiple Threads - Teacher View',
      description: 'List of message threads from teacher perspective',
      props: {
        threads: GALLERY_MESSAGE_THREADS,
        selectedThreadId: 90002,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Header Content',
      description: 'Thread list with header showing title and compose button',
      props: {
        threads: GALLERY_MESSAGE_THREADS.slice(0, 3),
        selectedThreadId: 90001,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'student',
        headerContent: 'Messages Header',
      },
      status: 'prod',
      category: 'layout',
    },
    {
      name: 'With Filter Content',
      description: 'Thread list with course filter dropdown',
      props: {
        threads: GALLERY_MESSAGE_THREADS,
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
        filterContent: 'Course Filter',
      },
      status: 'prod',
      category: 'layout',
    },
    {
      name: 'Announcement Threads',
      description: 'Showing announcement threads with recipient counts',
      props: {
        threads: GALLERY_MESSAGE_THREADS.filter((t) => t.conversation_type === 'announcement'),
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Mixed Read/Unread States',
      description: 'Shows combination of read and unread threads with visual differentiation',
      props: {
        threads: [
          GALLERY_THREAD_STUDENT_UNREAD,
          GALLERY_THREAD_STUDENT_READ,
          { ...GALLERY_THREAD_TEACHER, unread_count: 1 },
          { ...GALLERY_THREAD_TEACHER, id: 90019, unread_count: 0 },
        ],
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'All Unread Messages',
      description: 'All threads have unread indicators with bold typography',
      props: {
        threads: [
          GALLERY_THREAD_STUDENT_UNREAD,
          { ...GALLERY_THREAD_TEACHER, unread_count: 2 },
          GALLERY_THREAD_ANNOUNCEMENT,
        ],
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Selected Thread in List',
      description: 'One thread highlighted with brand background as active selection',
      props: {
        threads: [
          GALLERY_THREAD_STUDENT_UNREAD,
          GALLERY_THREAD_STUDENT_READ,
          GALLERY_THREAD_TEACHER,
        ],
        selectedThreadId: 90011,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Teacher Messages with Instructor Badges',
      description: 'Shows instructor badges on teacher participants from student perspective',
      props: {
        threads: [
          GALLERY_THREAD_TEACHER,
          { ...GALLERY_THREAD_TEACHER, id: 90020, unread_count: 0 },
        ],
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90003,
        userType: 'student',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Announcements with Student Counts',
      description: 'Shows announcement threads with recipient count badges',
      props: {
        threads: [GALLERY_THREAD_ANNOUNCEMENT, GALLERY_THREAD_ANNOUNCEMENT_UNREAD],
        selectedThreadId: null,
        onSelectThread: () => {},
        currentUserId: 90001,
        userType: 'teacher',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
// @ts-nocheck
