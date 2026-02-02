import type { Course, LessonWithProgress } from "../types"

import { CATEGORIES } from "./categories"
import { INSTRUCTORS } from "./instructors"

function getWednesdayDate(weeksOffset: number, hour = 19, minute = 0): string {
  const now = new Date()
  const today = now.getDay()
  const daysUntilWednesday = (3 - today + 7) % 7
  const nextWednesday = new Date(now)
  nextWednesday.setDate(now.getDate() + daysUntilWednesday + (weeksOffset * 7))
  nextWednesday.setHours(hour, minute, 0, 0)
  return nextWednesday.toISOString()
}

function getCurrentTimePlusMins(minutes: number): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() + minutes)
  return now.toISOString()
}

export const HARDCODED_COURSE: Course & { curriculum: LessonWithProgress[] } = {
  id: 10001,
  title: "Digital Photography: Mastering Light and Composition",
  description:
    "Transform your photography skills with this comprehensive course covering essential techniques in lighting, composition, and visual storytelling. Learn to capture stunning images in any environment, from natural landscapes to urban portraits. Through hands-on exercises and expert feedback, you'll develop your unique artistic vision while mastering technical fundamentals.",
  price: 149,
  state: "published",
  created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  category: CATEGORIES[1],
  instructor: INSTRUCTORS[1],
  whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-course",
  host_whereby_url: "https://thicket-test.whereby.com/thicket-photography-course?roomKey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZWV0aW5nSWQiOiIxMTQzMzc1NzYiLCJyb29tUmVmZXJlbmNlIjp7InJvb21OYW1lIjoiL3RoaWNrZXQtcGhvdG9ncmFwaHktY291cnNlIiwib3JnYW5pemF0aW9uSWQiOiIzMjgwNjMifSwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5zcnYud2hlcmVieS5jb20iLCJpYXQiOjE3NjIyOTU4ODUsInJvb21LZXlUeXBlIjoibWVldGluZ0hvc3QifQ.s11iJDnoqsfvrcIogc-k3cnKjYhAtg44hC8LRKtnXnk",
  learning_objectives: [
    "Master the fundamental principles of light and how it affects photography",
    "Understand and apply the rule of thirds, leading lines, and other composition techniques",
    "Learn to use your camera settings (aperture, shutter speed, ISO) creatively",
    "Develop skills in portrait photography with natural and artificial lighting",
    "Capture stunning landscape and architectural images",
    "Edit photos professionally using industry-standard techniques",
    "Build a cohesive portfolio showcasing your unique style",
    "Understand the business side of professional photography",
  ],
  cover_url:
    "https://images.pexels.com/photos/1983032/pexels-photo-1983032.jpeg?auto=compress&cs=tinysrgb&w=800",
  starts_at: getWednesdayDate(-3),
  course_timezone: "America/New_York",
  lessons_count: 6,
  curriculum: [
    {
      id: 100001,
      position: 1,
      title: "Introduction to Light and Camera Fundamentals",
      description:
        "Begin your photography journey by understanding the nature of light and mastering your camera's core settings.",
      topics: [
        "Welcome and course introduction",
        "Understanding light: quality, direction, and color temperature",
        "Camera anatomy and essential settings",
        "The exposure triangle: aperture, shutter speed, and ISO",
        "Shooting modes and when to use them",
        "Hands-on exercise: exploring your camera",
      ],
      scheduled_at: getWednesdayDate(-3, 19, 0),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-1",
      recording_url: "https://thicket-test.whereby.com/recording/photography-lesson-1-abc123",
      is_completed: true,
      is_locked: false,
    },
    {
      id: 100002,
      position: 2,
      title: "Composition Techniques and Visual Balance",
      description:
        "Learn the foundational rules of composition that transform good photos into great ones.",
      topics: [
        "The rule of thirds and golden ratio",
        "Leading lines and visual pathways",
        "Framing and negative space",
        "Symmetry and patterns in photography",
        "Breaking the rules effectively",
        "Assignment: compose 10 photos using different techniques",
      ],
      scheduled_at: getWednesdayDate(-2, 19, 0),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-2",
      recording_url: "https://thicket-test.whereby.com/recording/photography-lesson-2-def456",
      is_completed: true,
      is_locked: false,
    },
    {
      id: 100003,
      position: 3,
      title: "Portrait Photography and Working with People",
      description:
        "Master the art of capturing compelling portraits with natural and studio lighting.",
      topics: [
        "Connecting with your subject",
        "Portrait lighting patterns: Rembrandt, loop, butterfly",
        "Using natural window light",
        "Outdoor portrait techniques",
        "Posing and directing non-models",
        "Practice session: partner portraits",
      ],
      scheduled_at: getWednesdayDate(-1, 19, 0),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-3",
      recording_url: "https://thicket-test.whereby.com/recording/photography-lesson-3-ghi789",
      is_completed: true,
      is_locked: false,
    },
    {
      id: 100004,
      position: 4,
      title: "Landscape and Architectural Photography",
      description:
        "Capture the grandeur of landscapes and the beauty of built environments.",
      topics: [
        "Golden hour and blue hour shooting",
        "Using filters for landscape photography",
        "Architectural photography composition",
        "Long exposure techniques",
        "HDR and exposure bracketing",
        "Live shooting demonstration and Q&A",
      ],
      scheduled_at: getCurrentTimePlusMins(10),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-4",
      is_completed: false,
      is_locked: false,
    },
    {
      id: 100005,
      position: 5,
      title: "Post-Processing and Photo Editing Essentials",
      description:
        "Learn professional editing techniques to enhance your images while maintaining authenticity.",
      topics: [
        "Introduction to editing software workflow",
        "Color correction and white balance",
        "Exposure and contrast adjustments",
        "Selective editing and masking",
        "Sharpening and noise reduction",
        "Developing your editing style",
      ],
      scheduled_at: getWednesdayDate(1, 19, 0),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-5",
      is_completed: false,
      is_locked: false,
    },
    {
      id: 100006,
      position: 6,
      title: "Building Your Portfolio and Photography Business",
      description:
        "Transform your passion into a profession by understanding the business of photography.",
      topics: [
        "Curating a compelling portfolio",
        "Finding your niche and unique style",
        "Pricing your work and client communication",
        "Marketing yourself as a photographer",
        "Legal considerations and contracts",
        "Final portfolio review and course wrap-up",
      ],
      scheduled_at: getWednesdayDate(2, 19, 0),
      whereby_room_url: "https://thicket-test.whereby.com/thicket-photography-lesson-6",
      is_completed: false,
      is_locked: false,
    },
  ],
}

export function getHardcodedCourse(): Course & { curriculum: LessonWithProgress[] } {
  return HARDCODED_COURSE
}

export function getHardcodedCourseEnrolledCount(): number {
  return 12
}
