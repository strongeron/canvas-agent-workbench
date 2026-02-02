import type { AnchorHTMLAttributes, ReactNode } from "react"

type VisitOptions = {
  method?: "get" | "post" | "put" | "patch" | "delete"
  data?: Record<string, unknown>
  replace?: boolean
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
}

export function usePage<T = { url: string }>() {
  return {
    url: "/",
  } as T
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

