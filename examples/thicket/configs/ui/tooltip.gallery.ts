import type { TooltipProps } from "@/components/ui/tooltip"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

const tooltipMeta: GalleryComponentMeta = {
    id: 'ui/tooltip',
  sourceId: '@/components/ui/tooltip#TooltipProps',
  status: 'archive',
}

export const tooltipGalleryEntry: GalleryEntry<TooltipProps> = {
  name: 'Tooltip',
  importPath: tooltipMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/tooltip',
  layoutSize: 'small',
  allowOverflow: true,
  variants: [
    {
      name: 'Top',
      description: 'Tooltip positioned above',
      props: { content: 'This is a tooltip', side: 'top', children: '<button>Hover me (top)</button>' },
      status: 'archive',
      category: 'position',
    },
    {
      name: 'Right',
      description: 'Tooltip positioned to the right',
      props: { content: 'Additional information', side: 'right', children: '<button>Hover me (right)</button>' },
      status: 'archive',
      category: 'position',
    },
    {
      name: 'Bottom',
      description: 'Tooltip positioned below',
      props: { content: 'Help text appears here', side: 'bottom', children: '<button>Hover me (bottom)</button>' },
      status: 'archive',
      category: 'position',
    },
    {
      name: 'Left',
      description: 'Tooltip positioned to the left',
      props: { content: 'Quick tip for users', side: 'left', children: '<button>Hover me (left)</button>' },
      status: 'archive',
      category: 'position',
    },
  ],
}
