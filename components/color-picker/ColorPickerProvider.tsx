import { createContext, useContext, type ReactNode } from "react"

import type { ColorPickerRenderer } from "./types"

interface ColorPickerContextValue {
  renderPicker?: ColorPickerRenderer
}

const ColorPickerContext = createContext<ColorPickerContextValue>({})

interface ColorPickerProviderProps {
  children: ReactNode
  renderPicker?: ColorPickerRenderer
}

export function ColorPickerProvider({ children, renderPicker }: ColorPickerProviderProps) {
  return (
    <ColorPickerContext.Provider value={{ renderPicker }}>
      {children}
    </ColorPickerContext.Provider>
  )
}

export function useColorPickerRenderer() {
  const context = useContext(ColorPickerContext)
  return context.renderPicker
}
