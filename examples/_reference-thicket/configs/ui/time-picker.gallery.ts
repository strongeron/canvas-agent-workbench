import type { TimePickerProps } from "@/components/ui/time-picker"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const timePickerMeta: GalleryComponentMeta = {
    id: 'ui/time-picker',
  sourceId: '@/components/ui/time-picker#TimePickerProps',
  status: 'archive',
}

export const timePickerGalleryEntry: GalleryEntry<TimePickerProps> = {
  name: 'TimePicker',
  importPath: timePickerMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/time-picker',
  layoutSize: 'full',
  allowOverflow: true,
  variants: [
    {
      name: 'Default (12h)',
      description: 'Standard time picker with 12-hour format, infinite loop scrolling, stays open for multiple adjustments',
      props: { label: 'Lesson Time', value: '14:30', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: '24-Hour Format',
      description: 'Time picker displaying 24-hour format (23:34 instead of 11:34 PM)',
      props: { label: 'Military Time', value: '23:34', format: '24h', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Morning Time',
      description: 'Time picker with AM time selected',
      props: { label: 'Start Time', value: '09:00', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Evening Time',
      description: 'Time picker with PM time selected, showcasing precise minute selection',
      props: { label: 'Meeting Time', value: '18:45', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Precise Minutes',
      description: 'Time picker showing 1-minute precision (not limited to 15-minute intervals)',
      props: { label: 'Class Start', value: '13:07', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Late Evening (24h)',
      description: 'Late evening time in 24-hour format demonstrating format preservation',
      props: { label: 'Event Time', value: '23:42', format: '24h', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Midnight',
      description: 'Time picker at midnight showing edge case handling',
      props: { label: 'Start Time', value: '00:00', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Empty (Auto-Init)',
      description: 'Empty time picker that auto-initializes to current system time when opened',
      props: { label: 'Select Time', value: '', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Error State',
      description: 'Time picker with error message',
      props: { label: 'Meeting Time', value: '', error: 'Time is required', onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled time picker state',
      props: { label: 'Schedule Time', value: '10:00', disabled: true, onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Dark Variant',
      description: 'Time picker in dark mode with infinite scroll',
      props: { label: 'Session Time', value: '16:23', variant: 'dark', onChange: () => {} },
      status: 'archive',
      category: 'theme',
    },
  ],
}
