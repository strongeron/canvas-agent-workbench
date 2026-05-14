export function cycleVariantIndex(
  currentIndex: number,
  variantCount: number,
  direction: "previous" | "next"
): number {
  if (!Number.isInteger(currentIndex) || !Number.isInteger(variantCount) || variantCount <= 0) {
    return 0
  }
  if (variantCount === 1) return 0
  if (direction === "previous") {
    return Math.max(0, currentIndex - 1)
  }
  return Math.min(variantCount - 1, currentIndex + 1)
}
