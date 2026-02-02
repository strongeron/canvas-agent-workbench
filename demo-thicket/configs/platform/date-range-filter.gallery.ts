import type { DateRangeFilter } from "@thicket/platform/DateRangeFilter"
import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"

type DateRangeFilterProps = React.ComponentProps<typeof DateRangeFilter>

export const dateRangeFilterMeta: GalleryComponentMeta = {
  id: 'platform/date-range-filter',
  sourceId: '@thicket/platform/DateRangeFilter#DateRangeFilter',
  status: 'prod',
}

export const dateRangeFilterGalleryEntry: GalleryEntry<DateRangeFilterProps> = {
  name: 'DateRangeFilter',
  importPath: dateRangeFilterMeta.sourceId.split('#')[0],
  category: 'Filtering & Sorting',
  id: dateRangeFilterMeta.id,
  layoutSize: 'full',
  meta: dateRangeFilterMeta,
  variants: [
    {
      name: 'All (No Filter)',
      description: 'Default state showing all dates',
      props: {
        value: 'all',
        onChange: (range) => console.log('Changed to:', range),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Today Filter',
      description: 'Filtered to show only today',
      props: {
        value: 'today',
        onChange: (range) => console.log('Changed to:', range),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'This Week Filter',
      description: 'Filtered to show this week',
      props: {
        value: 'this_week',
        onChange: (range) => console.log('Changed to:', range),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Next 2 Weeks Filter',
      description: 'Filtered to show next 2 weeks',
      props: {
        value: 'next_2_weeks',
        onChange: (range) => console.log('Changed to:', range),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'This Month Filter',
      description: 'Filtered to show this month',
      props: {
        value: 'this_month',
        onChange: (range) => console.log('Changed to:', range),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
