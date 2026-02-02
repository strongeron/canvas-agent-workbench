export type AuthenticatedUser = {
  id?: number
  name?: string
  email?: string
  avatar_url?: string
  role: "teacher" | "student"
}

