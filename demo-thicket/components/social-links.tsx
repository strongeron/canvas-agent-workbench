import { Globe, Linkedin, Twitter } from "lucide-react"

interface SocialLinksProps {
  twitter?: string
  linkedin?: string
  website?: string
  variant?: "default" | "compact"
  className?: string
}

export function SocialLinks({
  twitter,
  linkedin,
  website,
  variant = "default",
  className = "",
}: SocialLinksProps) {
  const hasAnyLinks = twitter || linkedin || website

  if (!hasAnyLinks) {
    return null
  }

  const linkClass =
    variant === "compact"
      ? "text-muted-foreground hover:text-brand-600 transition-colors"
      : "text-muted-foreground hover:text-brand-600 transition-colors flex items-center gap-2"

  const iconSize = variant === "compact" ? "h-5 w-5" : "h-4 w-4"

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {twitter && (
        <a
          href={twitter}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Twitter profile"
        >
          <Twitter className={iconSize} />
          {variant === "default" && (
            <span className="text-sm">Twitter</span>
          )}
        </a>
      )}
      {linkedin && (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="LinkedIn profile"
        >
          <Linkedin className={iconSize} />
          {variant === "default" && (
            <span className="text-sm">LinkedIn</span>
          )}
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          aria-label="Personal website"
        >
          <Globe className={iconSize} />
          {variant === "default" && (
            <span className="text-sm">Website</span>
          )}
        </a>
      )}
    </div>
  )
}
