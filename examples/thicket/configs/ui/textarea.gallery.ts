import type { TextareaProps } from "@/components/ui/textarea"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import { propSchemas } from "../registry/schema-helpers"

export const textareaMeta: GalleryComponentMeta = {
  id: 'ui/textarea',
  sourceId: '@/components/ui/textarea#Textarea',
  status: 'prod',
}

export const textareaGalleryEntry: GalleryEntry<TextareaProps> = {
  name: 'Textarea',
  importPath: textareaMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: textareaMeta.id,
  layoutSize: 'small',
  meta: textareaMeta,
  variants: [
    {
      name: 'Interactive',
      description: 'Type and configure textarea properties live',
      props: { label: 'Description', placeholder: 'Enter description...', value: '', rows: 4 },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: propSchemas.textareaSchema(),
    },
    {
      name: 'Default',
      description: 'Standard textarea',
      props: { label: 'Description', placeholder: 'Enter description...', rows: 4 },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Helper Text',
      description: 'Textarea with helper text',
      props: { label: 'Bio', placeholder: 'Tell us about yourself...', helperText: 'This will be visible on your profile', rows: 4 },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Character Count',
      description: 'Textarea with character counter',
      props: { label: 'Course Description', placeholder: 'Describe your course...', characterCount: { current: 145, max: 500 }, rows: 5 },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Near Limit',
      description: 'Textarea approaching character limit',
      props: { label: 'Short Bio', characterCount: { current: 425, max: 500 }, defaultValue: 'A'.repeat(425), rows: 4, readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Over Limit',
      description: 'Textarea exceeding character limit',
      props: { label: 'Comment', characterCount: { current: 550, max: 500 }, defaultValue: 'A'.repeat(550), rows: 4, readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Error State',
      description: 'Textarea with error message',
      props: { label: 'Message', error: 'Message is required', rows: 3 },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Success State',
      description: 'Textarea with success message',
      props: { label: 'Feedback', success: 'Feedback submitted successfully', defaultValue: 'Great experience!', readOnly: true, rows: 3 },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled textarea',
      props: { label: 'Terms', defaultValue: 'This content cannot be edited.', disabled: true, rows: 3 },
      status: 'archive',
      category: 'state',
    },
  ],
}
