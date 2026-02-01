import type { ComponentVariant } from "../core/types"

type StatusFilter = "all" | "prod" | "wip" | "archive"

/**
 * Filter variants by status
 */
export function filterVariantsByStatus(
  variants: ComponentVariant[],
  statusFilter: StatusFilter
): ComponentVariant[] {
  if (statusFilter === "all") {
    return variants
  }

  return variants.filter((variant) => {
    const variantStatus = (variant.status as "prod" | "wip" | "archive" | undefined) ?? "prod"
    return variantStatus === statusFilter
  })
}

/**
 * Search variants by name and description (case-insensitive)
 */
export function searchVariantsByName(
  variants: ComponentVariant[],
  searchQuery: string
): ComponentVariant[] {
  if (!searchQuery.trim()) {
    return variants
  }

  const lowerQuery = searchQuery.toLowerCase()

  return variants.filter(
    (variant) =>
      variant.name.toLowerCase().includes(lowerQuery) ||
      variant.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Count variants by status
 */
export function countVariantsByStatus(variants: ComponentVariant[]): {
  prod: number
  wip: number
  archive: number
  total: number
} {
  const counts = { prod: 0, wip: 0, archive: 0, total: variants.length }

  variants.forEach((variant) => {
    const variantStatus = (variant.status as "prod" | "wip" | "archive" | undefined) ?? "prod"
    counts[variantStatus] = (counts[variantStatus] || 0) + 1
  })

  return counts
}

