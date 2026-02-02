import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

import type { Accordion } from '@thicket/components/ui/accordion'
import type { GalleryEntry } from '@thicket/platform/gallery/registry/types'
import { propSchemas } from '@thicket/platform/gallery/registry/schema-helpers'

type AccordionProps = ComponentProps<typeof Accordion>

const FAQ_ITEMS = [
  {
    id: 'format',
    question: 'What is the class format?',
    answer: 'All classes are live, interactive video sessions with expert instructors. You can ask questions, participate in discussions, and engage with other students in real-time.'
  },
  {
    id: 'size',
    question: 'How many students per class?',
    answer: 'We limit classes to 15 students maximum to ensure personalized attention and meaningful interaction with your instructor.'
  },
  {
    id: 'recordings',
    question: 'Can I watch recordings later?',
    answer: 'Yes! All sessions are recorded and available for review. You can revisit any class content at your own pace.'
  },
  {
    id: 'schedule',
    question: 'What if I miss a live session?',
    answer: 'No problem! Session recordings are available within 24 hours. You can also ask questions asynchronously via the message board.'
  }
]

const accordionMeta: GalleryComponentMeta = {
    id: 'ui/accordion',
  sourceId: '@thicket/components/ui/accordion#Accordion',
  status: 'prod',
}

export const accordionGalleryEntry: GalleryEntry<AccordionProps> = {
  name: 'Accordion',
  importPath: accordionMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/accordion',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Interactive',
      description: 'Configure accordion behavior live',
      props: { items: FAQ_ITEMS },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: {
        allowMultiple: propSchemas.boolean('Allow Multiple'),
      },
    },
    {
      name: 'Default - All Closed',
      description: 'FAQ accordion with 4 items, all initially closed',
      status: 'prod',
      category: 'variant',
      props: {
        items: FAQ_ITEMS
      }
    },
    {
      name: 'Single Open',
      description: 'First item open by default, single selection mode',
      status: 'prod',
      category: 'state',
      props: {
        items: FAQ_ITEMS,
        defaultOpen: ['format']
      }
    },
    {
      name: 'Allow Multiple Open',
      description: 'Multiple items can be expanded simultaneously',
      status: 'prod',
      category: 'state',
      props: {
        items: FAQ_ITEMS,
        allowMultiple: true,
        defaultOpen: ['format', 'recordings']
      }
    },
    {
      name: 'Long Content',
      description: 'Accordion with longer answer text demonstrating scroll',
      status: 'prod',
      category: 'layout',
      props: {
        items: [
          {
            id: 'long',
            question: 'Tell me everything about the learning platform',
            answer: 'Our platform provides a comprehensive learning experience with live interactive sessions, expert instructors from top universities, small class sizes (maximum 15 students), session recordings for review, dedicated message boards for each course, file sharing capabilities, progress tracking, and personalized dashboards. We focus on creating an intimate, engaging educational environment that combines the best of online convenience with the depth of traditional classroom discussion.'
          },
          ...FAQ_ITEMS.slice(0, 2)
        ]
      }
    },
    {
      name: 'With Formatted Answer',
      description: 'Answer with multiple paragraphs and detailed content',
      status: 'prod',
      category: 'variant',
      props: {
        items: [
          {
            id: 'detailed',
            question: 'What features are included?',
            answer: 'Premium features include: Live interactive video sessions with expert instructors, small discussion groups (maximum 15 students), session recordings available 24/7 for review, direct messaging with instructors and classmates, downloadable course materials and resources, progress tracking and completion certificates, and dedicated support throughout your learning journey.'
          },
          ...FAQ_ITEMS.slice(1, 3)
        ]
      }
    },
    {
      name: 'Single Item',
      description: 'Accordion with only one item',
      status: 'prod',
      category: 'layout',
      props: {
        items: [FAQ_ITEMS[0]]
      }
    }
  ]
}
