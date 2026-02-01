import type { DatePickerProps } from "@/components/ui/date-picker"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const datePickerMeta: GalleryComponentMeta = {
    id: 'ui/date-picker',
  sourceId: '@/components/ui/date-picker#DatePickerProps',
  status: 'archive',
}

export const datePickerGalleryEntry: GalleryEntry<DatePickerProps> = {
  name: 'DatePicker',
  importPath: datePickerMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/date-picker',
  layoutSize: 'full',
  allowOverflow: true,
  variants: [
    {
      name: 'Default',
      description: 'Standard date picker with custom styled calendar dropdown',
      props: { label: 'Select Date', value: '2025-11-15', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Selected Date',
      description: 'Date picker with selected date highlighted in brand colors',
      props: { label: 'Course Start Date', value: '2025-12-01', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Min Date',
      description: 'Date picker with minimum date constraint (past dates disabled)',
      props: { label: 'Start Date', value: '2025-12-01', onChange: () => {}, minDate: '2025-11-18' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'No Selection',
      description: 'Empty date picker showing placeholder',
      props: { label: 'Pick a Date', value: '', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Error State',
      description: 'Date picker with error message',
      props: { label: 'Due Date', value: '', error: 'Date is required', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled date picker state',
      props: { label: 'Course Start', value: '2025-11-18', disabled: true, onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
  ],
}
