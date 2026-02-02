import type { StatsSection } from "@thicket/platform/StatsSection"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

type StatsSectionProps = React.ComponentProps<typeof StatsSection>

const statsSectionMeta: GalleryComponentMeta = {
    id: 'platform/stats-section',
  sourceId: '@thicket/platform/StatsSection#StatsSection',
  status: 'archive',
}

export const statsSectionGalleryEntry: GalleryEntry<StatsSectionProps> = {
  name: 'StatsSection',
  importPath: statsSectionMeta.sourceId.split('#')[0],
  category: 'Platform Shared',
  id: 'platform/stats-section',
  layoutSize: 'large',
  variants: [
    {
      name: 'Layout Container',
      description: 'Container component for stats - demonstrates wrapper usage',
      props: {
        __skipRender: true,
      },
      status: 'archive',
      category: 'layout',
    },
  ],
}
