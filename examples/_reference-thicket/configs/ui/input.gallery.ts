import type { InputProps } from "@/components/ui/input"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import { propSchemas } from "../registry/schema-helpers"

export const inputMeta: GalleryComponentMeta = {
  id: 'ui/input',
  sourceId: '@/components/ui/input#Input',
  status: 'prod',
}

export const inputGalleryEntry: GalleryEntry<InputProps> = {
  name: 'Input',
  importPath: inputMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: inputMeta.id,
  layoutSize: 'small',
  meta: inputMeta,
  variants: [
    {
      name: 'Interactive',
      description: 'Type and see validation states change in real-time',
      props: { label: 'Email Address', placeholder: 'Enter your email', value: '' },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: propSchemas.inputSchema(),
    },
    {
      name: 'Default',
      description: 'Standard text input',
      props: { label: 'Email Address', placeholder: 'Enter your email' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Value',
      description: 'Input with pre-filled value',
      props: { label: 'Full Name', value: 'John Doe', placeholder: 'Enter your name', readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Error State',
      description: 'Input with error message',
      props: { label: 'Email', value: 'invalid-email', error: 'Please enter a valid email address', readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Success State',
      description: 'Input with success message',
      props: { label: 'Username', value: 'johndoe', success: 'Username is available', readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Warning State',
      description: 'Input with warning message',
      props: { label: 'Password', value: 'weak123', warning: 'Password is weak. Consider using a stronger password', readOnly: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled input field',
      props: { label: 'Account ID', value: 'ACC-12345', disabled: true },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Hidden Label',
      description: 'Input with visually hidden label (accessible)',
      props: { label: 'Search', placeholder: 'Search...', hideLabel: true },
      status: 'archive',
      category: 'variant',
    },
  ],
}
