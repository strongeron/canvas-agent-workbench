import { useId } from "react"

import { useColorPickerRenderer } from "./ColorPickerProvider"
import type { ColorPickerRenderProps } from "./types"

export function ColorPickerField({
  id,
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: ColorPickerRenderProps) {
  const generatedId = useId()
  const inputId = id || generatedId
  const renderPicker = useColorPickerRenderer()

  if (renderPicker) {
    return renderPicker({
      id: inputId,
      value,
      onChange,
      placeholder,
      className,
      disabled,
    })
  }

  return (
    <input
      id={inputId}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  )
}
