import { componentMap } from "./ComponentRenderer"
import { allComponents, allLayouts, allPagePatterns } from "./componentVariants"
import { Button } from "./components/ui/button"
import { Tooltip } from "./components/ui/tooltip"

export const thicketPack = {
  id: "thicket",
  label: "Thicket",
  entries: allComponents,
  layouts: allLayouts,
  patterns: allPagePatterns,
  componentMap,
  ui: {
    Button,
    Tooltip,
  },
}

export type ThicketPack = typeof thicketPack

