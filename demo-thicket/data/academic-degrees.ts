export const ACADEMIC_DEGREES = [
  "Certification",
  "BA",
  "BS",
  "MA",
  "MS",
  "MFA",
  "MPhil",
  "PhD",
]

export function filterAcademicDegrees(query: string): string[] {
  if (!query || query.trim().length === 0) {
    return ACADEMIC_DEGREES
  }

  const normalizedQuery = query.toLowerCase().trim()

  return ACADEMIC_DEGREES.filter((degree) =>
    degree.toLowerCase().includes(normalizedQuery)
  )
}
