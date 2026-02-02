import type { AuthorProfile } from "../types"

export interface EducationEntry {
  degree: "Certification" | "BA" | "BS" | "MA" | "MS" | "MFA" | "MPhil" | "PhD"
  field: string
  institution: string
  [key: string]: string
}

export interface TeachingExperienceEntry {
  position: "Teaching Assistant" | "Graduate Student Instructor" | "Adjunct" | "Lecturer" | "Assistant Professor" | "Associate Professor" | "Professor"
  field: string
  institution: string
  [key: string]: string
}

export interface InstructorSettings {
  email: string
  social_links?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
  education: EducationEntry[]
  teaching_experience: TeachingExperienceEntry[]
  payment_method?: string
  payout_schedule?: "weekly" | "monthly"
  stripe_connected?: boolean
  stripe_account_id?: string
  stripe_connected_date?: string
  video_intro_url?: string
  notification_preferences?: {
    email_notifications: boolean
    message_alerts: boolean
    course_updates: boolean
    weekly_summary: boolean
  }
  privacy_settings?: {
    profile_visibility: "public" | "private" | "students_only"
    data_sharing: boolean
  }
}

export const INSTRUCTORS: AuthorProfile[] = [
  {
    id: 1,
    name: "Marcus Thompson",
    avatar_url:
      "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Philosophy"],
    bio: "",
    credentials: "",
    timezone: "America/New_York",
  },
  {
    id: 2,
    name: "Sarah Chen",
    avatar_url:
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: [
      "Renaissance Architecture",
      "Urban Design",
      "Italian Art History",
    ],
    credentials: "PhD in Architectural History, MIT",
    bio: "Dr. Chen is a historian specializing in Renaissance architecture and urbanism, with a focus on the intersection of art, politics, and spatial design in early modern Italy. Her research examines how architectural patronage shaped civic identity in Florence and Rome.",
    timezone: "America/New_York",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    avatar_url:
      "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Science"],
    bio: "",
    credentials: "",
    timezone: "America/New_York",
  },
  {
    id: 4,
    name: "James Wilson",
    avatar_url:
      "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["History"],
    bio: "",
    credentials: "",
    timezone: "America/Chicago",
  },
  {
    id: 5,
    name: "Amara Okafor",
    avatar_url:
      "https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Literature"],
    bio: "",
    credentials: "",
    timezone: "America/New_York",
  },
  {
    id: 6,
    name: "David Park",
    avatar_url:
      "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Philosophy"],
    bio: "",
    credentials: "",
    timezone: "America/Los_Angeles",
  },
  {
    id: 7,
    name: "Isabella Rossi",
    avatar_url:
      "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Literature"],
    bio: "",
    credentials: "",
    timezone: "Europe/Rome",
  },
  {
    id: 8,
    name: "Ahmed Hassan",
    avatar_url:
      "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Science"],
    bio: "",
    credentials: "",
    timezone: "Asia/Dubai",
  },
  {
    id: 9,
    name: "Maria Santos",
    avatar_url:
      "https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Literature"],
    bio: "",
    credentials: "",
    timezone: "America/Sao_Paulo",
  },
  {
    id: 10,
    name: "Robert Fitzgerald",
    avatar_url:
      "https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Literature"],
    bio: "",
    credentials: "",
    timezone: "Europe/London",
  },
  {
    id: 11,
    name: "Yuki Tanaka",
    avatar_url:
      "https://images.pexels.com/photos/1382731/pexels-photo-1382731.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Philosophy"],
    bio: "",
    credentials: "",
    timezone: "Asia/Tokyo",
  },
  {
    id: 12,
    name: "Fatima Al-Rashid",
    avatar_url:
      "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: ["Science"],
    bio: "",
    credentials: "",
    timezone: "Asia/Riyadh",
  },
  {
    id: 13,
    name: "Nicholas Constantino",
    avatar_url:
      "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200",
    specializations: [],
    bio: "",
    credentials: "",
    timezone: "America/Los_Angeles",
  },
]

export const INSTRUCTOR_SETTINGS: Record<number, InstructorSettings> = {
  2: {
    email: "sarah.chen@example.com",
    social_links: {
      twitter: "https://twitter.com/sarahchen_arch",
      linkedin: "https://linkedin.com/in/sarahchen",
    },
    education: [
      {
        degree: "PhD",
        field: "Architectural History",
        institution: "Massachusetts Institute of Technology (MIT)",
      },
      {
        degree: "MA",
        field: "Art History",
        institution: "Yale University",
      },
    ],
    teaching_experience: [
      {
        position: "Associate Professor",
        field: "Architectural History",
        institution: "Columbia University",
      },
      {
        position: "Assistant Professor",
        field: "Renaissance Architecture",
        institution: "New York University (NYU)",
      },
    ],
    payment_method: "Bank Account (****1234)",
    payout_schedule: "monthly",
    video_intro_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    notification_preferences: {
      email_notifications: true,
      message_alerts: true,
      course_updates: true,
      weekly_summary: false,
    },
    privacy_settings: {
      profile_visibility: "public",
      data_sharing: false,
    },
  },
}

// Followed teachers storage key
const FOLLOWED_TEACHERS_KEY = "marketplace_followed_teachers"

export interface FollowedTeacher {
  studentId: number
  teacherId: number
  followedAt: string
}

export function getFollowedTeachers(studentId: number): number[] {
  if (typeof window === "undefined") return []
  const stored = localStorage.getItem(FOLLOWED_TEACHERS_KEY)
  if (!stored) return []
  const follows = JSON.parse(stored) as FollowedTeacher[]
  return follows.filter((f) => f.studentId === studentId).map((f) => f.teacherId)
}

export function isFollowingTeacher(studentId: number, teacherId: number): boolean {
  const followed = getFollowedTeachers(studentId)
  return followed.includes(teacherId)
}

export function followTeacher(studentId: number, teacherId: number): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(FOLLOWED_TEACHERS_KEY)
  const follows = stored ? (JSON.parse(stored) as FollowedTeacher[]) : []

  // Check if already following
  if (follows.some((f) => f.studentId === studentId && f.teacherId === teacherId)) {
    return false
  }

  follows.push({
    studentId,
    teacherId,
    followedAt: new Date().toISOString(),
  })

  localStorage.setItem(FOLLOWED_TEACHERS_KEY, JSON.stringify(follows))
  return true
}

export function unfollowTeacher(studentId: number, teacherId: number): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(FOLLOWED_TEACHERS_KEY)
  if (!stored) return false

  const follows = JSON.parse(stored) as FollowedTeacher[]
  const filtered = follows.filter(
    (f) => !(f.studentId === studentId && f.teacherId === teacherId)
  )

  localStorage.setItem(FOLLOWED_TEACHERS_KEY, JSON.stringify(filtered))
  return true
}

export function getTeacherFollowerCount(teacherId: number): number {
  if (typeof window === "undefined") return 0
  const stored = localStorage.getItem(FOLLOWED_TEACHERS_KEY)
  if (!stored) return 0
  const follows = JSON.parse(stored) as FollowedTeacher[]
  return follows.filter((f) => f.teacherId === teacherId).length
}

export function calculateProfileCompletion(instructor: AuthorProfile): number {
  let completed = 0
  const total = 5

  if (instructor.name && instructor.name.trim().length > 0) completed++
  if (instructor.bio && instructor.bio.length >= 100) completed++
  if (instructor.credentials && instructor.credentials.trim().length > 0) completed++
  if (instructor.specializations && instructor.specializations.length >= 2) completed++
  if (instructor.avatar_url) completed++

  return Math.round((completed / total) * 100)
}

export function getStripeConnectionStatus(instructorId: number): {
  connected: boolean
  accountId?: string
  connectedDate?: string
} {
  const settings = INSTRUCTOR_SETTINGS[instructorId]
  return {
    connected: settings?.stripe_connected || false,
    accountId: settings?.stripe_account_id,
    connectedDate: settings?.stripe_connected_date,
  }
}
