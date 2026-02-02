export const ACADEMIC_POSITIONS = [
  "Teaching Assistant",
  "Graduate Student Instructor",
  "Adjunct",
  "Lecturer",
  "Assistant Professor",
  "Associate Professor",
  "Professor",
]

export function filterAcademicPositions(query: string): string[] {
  if (!query || query.trim().length === 0) {
    return ACADEMIC_POSITIONS
  }

  const normalizedQuery = query.toLowerCase().trim()

  return ACADEMIC_POSITIONS.filter((position) =>
    position.toLowerCase().includes(normalizedQuery)
  )
}
