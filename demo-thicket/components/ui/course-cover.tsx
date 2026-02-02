import type React from "react"
import { Calendar } from "lucide-react"
import { cn } from "@thicket/lib/utils"
import { ImagePlaceholder } from "./image-placeholder"

export type CourseCoverVariant = "card" | "icon"
export type CourseCoverAspectRatio = "4/3" | "3/2" | "video" | "square" | "auto"
export type CourseCoverSize = "xs" | "sm" | "md" | "lg" | "xl" | "fixed"

export interface CourseCoverProps {
  /** Course cover image URL */
  coverUrl?: string
  /** Course title for alt text */
  title: string
  /** Variant: "card" for full card images, "icon" for small lesson icons */
  variant?: CourseCoverVariant
  /** Size preset (only used for "icon" variant or "fixed" aspectRatio) */
  size?: CourseCoverSize
  /** Aspect ratio (only used for "card" variant) */
  aspectRatio?: CourseCoverAspectRatio
  /** Fixed dimensions (only used when size="fixed") */
  fixedSize?: { width: number; height: number }
  /** Custom className */
  className?: string
  /** ImagePlaceholder size (only used for "card" variant) */
  placeholderSize?: "sm" | "md" | "lg"
  /** Show gradient overlay (only used for "card" variant) */
  showOverlay?: boolean
  /** Image loading strategy */
  loading?: "lazy" | "eager"
  /** Disable pointer events on image */
  pointerEventsNone?: boolean
  /** Optional children to render when no coverUrl (for custom fallbacks) */
  children?: React.ReactNode
}

const iconSizeClasses: Record<CourseCoverSize, string> = {
  xs: "h-8 w-8",
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
  xl: "h-24 w-24",
  fixed: "", // Will use fixedSize prop
}

const iconIconSizes: Record<CourseCoverSize, string> = {
  xs: "h-4 w-4",
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
  xl: "h-12 w-12",
  fixed: "h-8 w-8", // Default for fixed
}

const aspectRatioClasses: Record<CourseCoverAspectRatio, string> = {
  "4/3": "aspect-4/3",
  "3/2": "aspect-[3/2]",
  video: "aspect-video",
  square: "aspect-square",
  auto: "", // No aspect ratio constraint
}

/**
 * Unified CourseCover component that handles both:
 * - Card variant: Full-size course cover images with ImagePlaceholder fallback
 * - Icon variant: Small lesson cover images with Calendar icon fallback
 */
export function CourseCover({
  coverUrl,
  title,
  variant = "card",
  size = "md",
  aspectRatio = "4/3",
  fixedSize,
  className = "",
  placeholderSize = "lg",
  showOverlay = false,
  loading = "lazy",
  pointerEventsNone = false,
  children,
}: CourseCoverProps) {
  // Icon variant: Small lesson cover with Calendar icon fallback
  if (variant === "icon") {
    const containerSize = fixedSize ? "" : iconSizeClasses[size]
    const iconSize = iconIconSizes[size]
    const containerStyle = fixedSize
      ? { width: `${fixedSize.width}px`, height: `${fixedSize.height}px` }
      : undefined

    if (coverUrl) {
      return (
        <img
          src={coverUrl}
          alt={title}
          style={containerStyle}
          className={cn(
            containerSize,
            "rounded-lg object-cover shrink-0",
            className
          )}
          loading={loading}
        />
      )
    }

    return (
      <div
        style={containerStyle}
        className={cn(
          containerSize,
          "rounded-lg bg-brand-100 flex items-center justify-center shrink-0",
          className
        )}
      >
        <Calendar className={cn(iconSize, "text-brand-600")} />
      </div>
    )
  }

  // Card variant: Full-size course cover with ImagePlaceholder fallback
  const aspectClass = aspectRatio === "auto" ? "" : aspectRatioClasses[aspectRatio]
  const containerClasses = cn(
    "bg-surface-100 relative overflow-hidden",
    aspectClass,
    fixedSize ? "" : "w-full",
    className
  )

  const imageClasses = cn(
    "h-full w-full object-cover object-center",
    pointerEventsNone && "pointer-events-none"
  )
  
  const containerStyle = fixedSize
    ? { width: `${fixedSize.width}px`, height: `${fixedSize.height}px` }
    : undefined

  // If coverUrl exists, show image
  if (coverUrl) {
    return (
      <div className={containerClasses} style={containerStyle}>
        <img
          src={coverUrl}
          alt={title}
          className={imageClasses}
          loading={loading}
        />
        {showOverlay && (
          <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-transparent" />
        )}
      </div>
    )
  }

  // If children provided, render them as custom fallback
  if (children) {
    return (
      <div className={containerClasses} style={containerStyle}>
        {children}
      </div>
    )
  }

  // Default fallback: ImagePlaceholder
  return (
    <div className={containerClasses} style={containerStyle}>
      <ImagePlaceholder type="course" size={placeholderSize} />
    </div>
  )
}

