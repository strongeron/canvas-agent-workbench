import type { GalleryComponentMeta } from "@thicket/platform/gallery/types"
import type { PagePatternEntry } from "@thicket/platform/gallery/registry/types"

export const browsePageMeta: GalleryComponentMeta = {
  id: 'page-patterns/browse-page',
  sourceId: '@thicket/platform/layouts/patterns/BrowsePageLayout#BrowsePageLayout',
  status: 'wip',
}

export const browsePageGalleryEntry: PagePatternEntry<Record<string, unknown>> = {
  id: browsePageMeta.id,
  name: 'Browse Page',
  kind: 'page-pattern',
  importPath: browsePageMeta.sourceId.split('#')[0],
  category: 'Page Patterns',
  patternType: 'browse',
  routePattern: '/courses',
  description: 'Browse/discovery page with hero, filters, and content grid',
  layoutSize: 'full',
  meta: browsePageMeta,
  slots: [
    { name: 'hero', required: false, description: 'Hero section at top' },
    { name: 'filters', required: true, description: 'Filter controls for browsing' },
    { name: 'content', required: true, description: 'Content grid/list' },
  ],
  variants: [
    {
      name: 'Default - With Hero',
      description: 'Browse page with hero section and filters',
      props: {
        hasHero: true,
        hasFilters: true,
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Compact - No Hero',
      description: 'Browse page without hero, filters at top',
      props: {
        hasHero: false,
        hasFilters: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}

