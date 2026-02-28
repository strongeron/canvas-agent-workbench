import type { ReactNode } from "react"

interface CopilotKitProps {
  children?: ReactNode
}

export function CopilotKit({ children }: CopilotKitProps) {
  return <>{children}</>
}

export function useCopilotReadable(_config: unknown) {
  return undefined
}

export function useCopilotAction(_config: unknown) {
  // No-op fallback when CopilotKit packages are not installed.
}

