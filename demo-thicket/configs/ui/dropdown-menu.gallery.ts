import type { DropdownMenuProps } from "../../components/ui/dropdown-menu"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from '../../platform/gallery/types'

const dropdownMenuMeta: GalleryComponentMeta = {
    id: 'ui/dropdown-menu',
  sourceId: '../../components/ui/dropdown-menu#DropdownMenuProps',
  status: 'archive',
}

export const dropdownMenuGalleryEntry: GalleryEntry<DropdownMenuProps> = {
  name: 'DropdownMenu',
  importPath: dropdownMenuMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/dropdown-menu',
  layoutSize: 'full',
  allowOverflow: true,
  variants: [
    {
      name: 'Left Aligned',
      description: 'Dropdown menu aligned to the left',
      props: { trigger: '<button>Options</button>', align: 'left', children: 'Menu items' },
      status: 'archive',
      category: 'position',
    },
    {
      name: 'Right Aligned',
      description: 'Dropdown menu aligned to the right',
      props: { trigger: '<button>More</button>', align: 'right', children: 'Menu items' },
      status: 'archive',
      category: 'position',
    },
  ],
}
