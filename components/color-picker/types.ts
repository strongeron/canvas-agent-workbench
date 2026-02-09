import type { ReactElement } from "react"

export interface ColorPickerRenderProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export type ColorPickerRenderer = (props: ColorPickerRenderProps) => ReactElement
