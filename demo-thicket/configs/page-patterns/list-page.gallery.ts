import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { PagePatternEntry } from "@thicket/platform/gallery/registry/types"

export const listPageMeta: GalleryComponentMeta = {
  id: 'page-patterns/list-page',
  sourceId: '@thicket/platform/layouts/patterns/ListPageLayout#ListPageLayout',
  status: 'wip',
}

export const listPageGalleryEntry: PagePatternEntry<Record<string, unknown>> = {
  id: listPageMeta.id,
  name: 'List Page',
  kind: 'page-pattern',
  importPath: listPageMeta.sourceId.split('#')[0],
  category: 'Page Patterns',
  patternType: 'list',
  routePattern: '/**/index',
  description: 'List page layout with filters, search, and grid/list view toggle',
  layoutSize: 'full',
  meta: listPageMeta,
  slots: [
    { name: 'header', required: false, description: 'Page header with title' },
    { name: 'filters', required: false, description: 'Filter controls' },
    { name: 'search', required: false, description: 'Search input' },
    { name: 'viewToggle', required: false, description: 'Grid/list view toggle' },
    { name: 'content', required: true, description: 'Main list/grid content area' },
  ],
  variants: [
    {
      name: 'Default - With Filters',
      description: 'List page with filters and grid view',
      props: {
        hasFilters: true,
        hasSearch: true,
        viewMode: 'grid',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'List View',
      description: 'List page in list/table view mode',
      props: {
        hasFilters: true,
        hasSearch: true,
        viewMode: 'list',
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Simple List',
      description: 'Simple list without filters',
      props: {
        hasFilters: false,
        hasSearch: false,
        viewMode: 'list',
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

