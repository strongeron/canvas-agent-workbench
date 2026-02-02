import type { ReactNode } from "react"

interface LegalContentWrapperProps {
  children: ReactNode
}

export function LegalContentWrapper({ children }: LegalContentWrapperProps) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <article className="prose prose-brand max-w-none">{children}</article>
      </div>
    </section>
  )
}
