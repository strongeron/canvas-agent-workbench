import { AlertCircle, Image as ImageIcon, Search } from "lucide-react"

interface EmptyStateProps {
  variant?: "no-results" | "error" | "empty"
  title?: string
  description?: string
  icon?: React.ReactNode
}

export function EmptyState({
  variant = "empty",
  title,
  description,
  icon,
}: EmptyStateProps) {
  const getDefaultContent = () => {
    switch (variant) {
      case "no-results":
        return {
          icon: <Search className="text-muted h-16 w-16" />,
          title: "No courses found",
          description:
            "Try adjusting your filters or search criteria to find what you're looking for.",
        }
      case "error":
        return {
          icon: <AlertCircle className="text-error h-16 w-16" />,
          title: "Something went wrong",
          description:
            "We encountered an error loading the courses. Please try again later.",
        }
      default:
        return {
          icon: <ImageIcon className="text-muted h-16 w-16" />,
          title: "No content available",
          description: "There's nothing to display at the moment.",
        }
    }
  }

  const defaults = getDefaultContent()

  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 opacity-60">{icon ?? defaults.icon}</div>
      <h3 className="text-foreground font-display mb-3 text-xl font-bold">
        {title ?? defaults.title}
      </h3>
      <p className="text-muted-foreground max-w-md text-base leading-relaxed">
        {description ?? defaults.description}
      </p>
    </div>
  )
}
