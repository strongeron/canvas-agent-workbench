import type { StatsSection } from "@/platform/components/StatsSection"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

type StatsSectionProps = React.ComponentProps<typeof StatsSection>

const statsSectionMeta: GalleryComponentMeta = {
    id: 'platform/stats-section',
  sourceId: '@/platform/components/StatsSection#StatsSection',
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
