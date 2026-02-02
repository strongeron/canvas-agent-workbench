import { Link } from "@thicket/shims/inertia-react"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  path?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="mb-6 flex items-center text-sm" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={index} className="flex items-center gap-2">
              {item.path && !isLast ? (
                <Link
                  href={item.path}
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors duration-200"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={
                    isLast
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground font-medium"
                  }
                >
                  {item.label}
                </span>
              )}

              {!isLast && (
                <ChevronRight className="text-muted h-4 w-4 shrink-0" />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
