export interface CourseDraft {
  id: number
  title: string
  description: string
  price: number
  category_id: number | null
  tags: string[]
  cover_url?: string
  starts_at: string | null
  start_time: string | null
  learning_objectives: string[]
  lessons: {
    id: number
    title: string
    description: string
    topics: string[]
    attachments: {
      filename: string
      original_name: string
      url: string
    }[]
    position: number
  }[]
  faq: {
    question: string
    answer: string
  }[]
  recommended_readings: {
    title: string
    description: string
  }[]
  instructor_id: number
  last_saved: string
  step: number
}

export const DRAFTS: CourseDraft[] = []

export function saveDraft(draft: Partial<CourseDraft> & { id?: number }): CourseDraft {
  const existingIndex = draft.id ? DRAFTS.findIndex((d) => d.id === draft.id) : -1

  if (existingIndex !== -1) {
    DRAFTS[existingIndex] = {
      ...DRAFTS[existingIndex],
      ...draft,
      last_saved: new Date().toISOString(),
    }
    return DRAFTS[existingIndex]
  }

  const newDraft: CourseDraft = {
    id: DRAFTS.length + 1,
    title: "",
    description: "",
    price: 0,
    category_id: null,
    tags: [],
    starts_at: null,
    start_time: null,
    learning_objectives: [],
    lessons: [],
    faq: [],
    recommended_readings: [],
    instructor_id: 1,
    last_saved: new Date().toISOString(),
    step: 1,
    ...draft,
  }

  DRAFTS.push(newDraft)
  return newDraft
}

export function getDraft(id: number): CourseDraft | undefined {
  return DRAFTS.find((draft) => draft.id === id)
}

export function deleteDraft(id: number): boolean {
  const index = DRAFTS.findIndex((draft) => draft.id === id)
  if (index !== -1) {
    DRAFTS.splice(index, 1)
    return true
  }
  return false
}
