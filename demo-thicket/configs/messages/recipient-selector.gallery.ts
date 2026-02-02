import type { GalleryEntry } from '../../platform/gallery/registry/types'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

interface Recipient {
  id: number
  name: string
  type: 'teacher' | 'student'
  avatar_url: string
  course_ids?: number[]
}

interface RecipientSelectorProps {
  recipients: Recipient[]
  instructorRecipients?: Recipient[]
  studentRecipients?: Recipient[]
  selectedRecipientId: number | null
  onSelectRecipient: (id: number) => void
  disabled?: boolean
  showSections?: boolean
}

const MOCK_INSTRUCTORS: Recipient[] = [
  {
    id: 90001,
    name: 'Dr. Emily Watson',
    type: 'teacher',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    course_ids: [90001],
  },
]

const MOCK_STUDENTS: Recipient[] = [
  {
    id: 90101,
    name: 'Alex Thompson',
    type: 'student',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    course_ids: [90001],
  },
  {
    id: 90102,
    name: 'Jordan Martinez',
    type: 'student',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    course_ids: [90001],
  },
  {
    id: 90103,
    name: 'Sam Chen',
    type: 'student',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sam',
    course_ids: [90001],
  },
]

const recipientSelectorMeta: GalleryComponentMeta = {
    id: 'messages/recipient-selector',
  sourceId: '../../platform/MessageComposer/RecipientSelector#RecipientSelector',
  status: 'archive',
}

export const recipientSelectorGalleryEntry: GalleryEntry<RecipientSelectorProps> = {
  id: 'messages/recipient-selector',
  name: 'RecipientSelector',
  importPath: recipientSelectorMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Student List (Teacher View)',
      description: 'Simple list of students for teacher to select',
      props: {
        recipients: MOCK_STUDENTS,
        selectedRecipientId: null,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: false,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Selection',
      description: 'Recipient list with one student selected',
      props: {
        recipients: MOCK_STUDENTS,
        selectedRecipientId: 90101,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: false,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Instructor + Classmates (Student View)',
      description: 'Sectioned view with instructor first, then classmates',
      props: {
        recipients: [...MOCK_INSTRUCTORS, ...MOCK_STUDENTS],
        instructorRecipients: MOCK_INSTRUCTORS,
        studentRecipients: MOCK_STUDENTS,
        selectedRecipientId: null,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: true,
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Instructor Selected',
      description: 'Student view with instructor selected',
      props: {
        recipients: [...MOCK_INSTRUCTORS, ...MOCK_STUDENTS],
        instructorRecipients: MOCK_INSTRUCTORS,
        studentRecipients: MOCK_STUDENTS,
        selectedRecipientId: 90001,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: true,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Empty Recipients',
      description: 'No recipients available for the selected course',
      props: {
        recipients: [],
        selectedRecipientId: null,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: false,
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Many Recipients (Scrollable)',
      description: 'Long list of recipients requiring scroll',
      props: {
        recipients: Array.from({ length: 15 }, (_, i) => ({
          id: 90200 + i,
          name: `Student ${i + 1}`,
          type: 'student' as const,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=Student${i}`,
          course_ids: [90001],
        })),
        selectedRecipientId: 90205,
        onSelectRecipient: () => console.log('Selected'),
        disabled: false,
        showSections: false,
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
