declare module "@copilotkit/react-core" {
  import * as React from "react"

  export interface CopilotKitProps {
    runtimeUrl?: string
    children?: React.ReactNode
    [key: string]: unknown
  }

  export function CopilotKit(props: CopilotKitProps): React.ReactElement
  export function useCopilotReadable(config: unknown): string | undefined
  export function useCopilotAction(config: unknown): void
}

declare module "@copilotkit/react-ui" {
  import * as React from "react"
  export const CopilotChat: React.ComponentType<Record<string, unknown>>
}

declare module "@copilotkit/react-ui/styles.css"

declare module "@copilotkit/runtime" {
  export const CopilotRuntime: new (...args: unknown[]) => unknown
  export const AnthropicAdapter: new (...args: unknown[]) => unknown
  export function copilotRuntimeNodeHttpEndpoint(input: unknown): (
    req: unknown,
    res: unknown
  ) => Promise<void>
}

declare module "@anthropic-ai/sdk" {
  const Anthropic: new (...args: unknown[]) => unknown
  export default Anthropic
}
