import type { AnchorHTMLAttributes, ReactNode } from "react"
import { useSyncExternalStore } from "react"

type PageState = {
  url: string
  props: Record<string, unknown>
}

let pageState: PageState = {
  url: "/",
  props: {},
}

const pageListeners = new Set<() => void>()

function subscribePage(listener: () => void) {
  pageListeners.add(listener)
  return () => pageListeners.delete(listener)
}

function setPageState(next: PageState) {
  pageState = next
  pageListeners.forEach((listener) => listener())
}

type VisitOptions = {
  method?: "get" | "post" | "put" | "patch" | "delete"
  data?: Record<string, unknown>
  replace?: boolean
  preserveScroll?: boolean
  preserveState?: boolean
}

type ReplaceOptions = {
  props?: Record<string, unknown> | ((currentProps: Record<string, unknown>) => Record<string, unknown>)
  preserveScroll?: boolean
  preserveState?: boolean
}

export const router = {
  visit: (_href: string, _options?: VisitOptions) => {},
  get: (_href: string, _data?: Record<string, unknown>, _options?: VisitOptions) => {},
  post: (_href: string, _data?: Record<string, unknown>, _options?: VisitOptions) => {},
  put: (_href: string, _data?: Record<string, unknown>, _options?: VisitOptions) => {},
  patch: (_href: string, _data?: Record<string, unknown>, _options?: VisitOptions) => {},
  delete: (_href: string, _options?: VisitOptions) => {},
  replace: (options?: ReplaceOptions) => {
    if (!options?.props) return
    const nextProps =
      typeof options.props === "function"
        ? options.props(pageState.props)
        : options.props
    setPageState({
      ...pageState,
      props: nextProps,
    })
  },
}

export function usePage<T = { url: string }>() {
  const state = useSyncExternalStore(subscribePage, () => pageState, () => pageState)
  return state as T
}

export function Link({
  href,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}

export function Head({ children }: { children: ReactNode }) {
  return <>{children}</>
}

type FormRenderProps = {
  errors: Record<string, string>
  processing: boolean
}

type FormProps = {
  method?: string
  action?: string
  options?: { only?: string[] }
  onSuccess?: () => void
  onError?: () => void
  children: ReactNode | ((props: FormRenderProps) => ReactNode)
}

export function Form({
  method = "post",
  action = "#",
  onSuccess,
  children,
}: FormProps) {
  const renderProps: FormRenderProps = {
    errors: {},
    processing: false,
  }

  const content = typeof children === "function" ? children(renderProps) : children

  return (
    <form
      method={method}
      action={action}
      onSubmit={(event) => {
        event.preventDefault()
        onSuccess?.()
      }}
    >
      {content}
    </form>
  )
}
