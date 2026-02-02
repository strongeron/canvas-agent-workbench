import type { Assignment } from "@thicket/types"

let assignmentsStore: Assignment[] = []
let nextAssignmentId = 1

export function getAssignments(): Assignment[] {
  return [...assignmentsStore]
}

export function getAssignmentsByLessonId(lessonId: number): Assignment[] {
  return assignmentsStore.filter((a) => a.lesson_id === lessonId)
}

export function addAssignment(assignment: Omit<Assignment, "id">): Assignment {
  const newAssignment: Assignment = {
    ...assignment,
    id: nextAssignmentId++,
  }
  assignmentsStore.push(newAssignment)
  return newAssignment
}

export function removeAssignment(assignmentId: number): void {
  assignmentsStore = assignmentsStore.filter((a) => a.id !== assignmentId)
}

export function removeAssignmentsByLessonId(lessonId: number): void {
  assignmentsStore = assignmentsStore.filter((a) => a.lesson_id !== lessonId)
}

export function updateAssignment(
  assignmentId: number,
  updates: Partial<Assignment>,
): Assignment | null {
  const index = assignmentsStore.findIndex((a) => a.id === assignmentId)
  if (index === -1) return null

  assignmentsStore[index] = {
    ...assignmentsStore[index],
    ...updates,
  }
  return assignmentsStore[index]
}

export function clearAssignments(): void {
  assignmentsStore = []
  nextAssignmentId = 1
}
