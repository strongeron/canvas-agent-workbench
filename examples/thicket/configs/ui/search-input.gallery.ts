import type { SearchInputProps } from "@/components/ui/search-input"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import { propSchemas } from "../registry/schema-helpers"

export const searchInputMeta: GalleryComponentMeta = {
  id: 'ui/search-input',
  sourceId: '@/components/ui/search-input#SearchInput',
  status: 'prod',
}

export const searchInputGalleryEntry: GalleryEntry<SearchInputProps> = {
  name: 'SearchInput',
  importPath: searchInputMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: searchInputMeta.id,
  layoutSize: 'small',
  meta: searchInputMeta,
  variants: [
    {
      name: 'Interactive',
      description: 'Type and search in real-time',
      props: { value: '', placeholder: 'Search courses...', onChange: () => {} },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: propSchemas.searchInputSchema(),
    },
    {
      name: 'Empty',
      description: 'Search input without value',
      props: { value: '', placeholder: 'Search courses...', onChange: () => {} },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'With Value',
      description: 'Search input with entered text',
      props: { value: 'Renaissance Art', placeholder: 'Search courses...', onClear: () => {}, onChange: () => {} },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Custom Placeholder',
      description: 'Search with custom placeholder text',
      props: { value: '', placeholder: 'Find students, courses, or lessons...', onChange: () => {} },
      status: 'archive',
      category: 'variant',
    },
  ],
}
