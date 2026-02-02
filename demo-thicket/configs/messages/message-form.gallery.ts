import type { GalleryEntry } from '../../platform/gallery/registry/types'
import type { GalleryComponentMeta } from '../../platform/gallery/types'

interface MessageFormProps {
  subject: string
  onSubjectChange: (value: string) => void
  body: string
  onBodyChange: (value: string) => void
  disabled?: boolean
  bodyRows?: number
  subjectPlaceholder?: string
  bodyPlaceholder?: string
}

const messageFormMeta: GalleryComponentMeta = {
    id: 'messages/message-form',
  sourceId: '../../platform/MessageComposer/MessageForm#MessageForm',
  status: 'archive',
}

export const messageFormGalleryEntry: GalleryEntry<MessageFormProps> = {
  id: 'messages/message-form',
  name: 'MessageForm',
  importPath: messageFormMeta.sourceId.split('#')[0],
  category: 'Communication',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Empty Form',
      description: 'Message form with no content entered',
      props: {
        subject: '',
        onSubjectChange: () => console.log('Subject changed'),
        body: '',
        onBodyChange: () => console.log('Body changed'),
        disabled: false,
        bodyRows: 8,
        subjectPlaceholder: 'Enter message subject',
        bodyPlaceholder: 'Type your message here...',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Filled Form',
      description: 'Message form with subject and body content',
      props: {
        subject: 'Assignment 3 Deadline Extension',
        onSubjectChange: () => console.log('Subject changed'),
        body: 'Hello everyone,\n\nI wanted to let you know that the deadline for Assignment 3 has been extended to next Friday at 11:59 PM. This should give everyone more time to complete the work.\n\nBest regards',
        onBodyChange: () => console.log('Body changed'),
        disabled: false,
        bodyRows: 8,
        subjectPlaceholder: 'Enter message subject',
        bodyPlaceholder: 'Type your message here...',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled State',
      description: 'Form in disabled state while sending',
      props: {
        subject: 'Important Course Update',
        onSubjectChange: () => console.log('Subject changed'),
        body: 'Please note the class schedule change for next week...',
        onBodyChange: () => console.log('Body changed'),
        disabled: true,
        bodyRows: 8,
        subjectPlaceholder: 'Enter message subject',
        bodyPlaceholder: 'Type your message here...',
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Announcement Placeholders',
      description: 'Form with announcement-specific placeholders',
      props: {
        subject: '',
        onSubjectChange: () => console.log('Subject changed'),
        body: '',
        onBodyChange: () => console.log('Body changed'),
        disabled: false,
        bodyRows: 8,
        subjectPlaceholder: 'Enter announcement subject',
        bodyPlaceholder: 'Type your announcement here...',
      },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Compact Body (4 Rows)',
      description: 'Form with smaller textarea',
      props: {
        subject: 'Quick Question',
        onSubjectChange: () => console.log('Subject changed'),
        body: 'Can you please clarify the requirements for the final project?',
        onBodyChange: () => console.log('Body changed'),
        disabled: false,
        bodyRows: 4,
        subjectPlaceholder: 'Enter message subject',
        bodyPlaceholder: 'Type your message here...',
      },
      status: 'archive',
      category: 'variant',
    },
  ],
}
