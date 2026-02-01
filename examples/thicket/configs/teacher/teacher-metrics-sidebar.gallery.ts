import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import type { Course } from "@/types"

interface TeacherMetricsSidebarProps {
  course: Course
  enrolledStudentsCount: number
  averageProgress?: number
  totalRevenue?: number
  completionRate?: number
  isMobile?: boolean
  onMakeAnnouncement?: () => void
}

export const teacherMetricsSidebarMeta: GalleryComponentMeta = {
  id: 'teacher/teacher-metrics-sidebar',
  sourceId: '@/platform/components/Teacher/TeacherMetricsSidebar#TeacherMetricsSidebar',
  status: 'prod',
}

export const teacherMetricsSidebarGalleryEntry: GalleryEntry<TeacherMetricsSidebarProps> = {
  name: 'TeacherMetricsSidebar',
  importPath: teacherMetricsSidebarMeta.sourceId.split('#')[0],
  category: 'Teacher',
  id: teacherMetricsSidebarMeta.id,
  layoutSize: 'full',
  meta: teacherMetricsSidebarMeta,
  variants: [
    {
      name: 'Published Course',
      description: 'Metrics for active published course',
      props: {
        course: {
          id: 90001,
          title: "Introduction to Web Development",
          description: "Learn HTML, CSS, and JavaScript",
          instructor_id: 90001,
          instructor_name: "Dr. Emily Watson",
          instructor_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          category_id: 1,
          price: 79.99,
          thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          cover_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          duration_weeks: 8,
          level: "Beginner",
          status: "published",
          state: "published",
          enrollment_count: 42,
          rating: 4.7,
          review_count: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        enrolledStudentsCount: 42,
        averageProgress: 68,
        totalRevenue: 3359.58,
        completionRate: 85,
        isMobile: false,
        onMakeAnnouncement: () => {},
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Draft Course',
      description: 'Metrics for course in draft state',
      props: {
        course: {
          id: 90002,
          title: "Advanced React Patterns",
          description: "Master React hooks and patterns",
          instructor_id: 90001,
          instructor_name: "Dr. Emily Watson",
          instructor_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          category_id: 1,
          price: 99.99,
          thumbnail_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
          cover_url: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800",
          duration_weeks: 10,
          level: "Advanced",
          status: "draft",
          state: "draft",
          enrollment_count: 0,
          rating: 0,
          review_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        enrolledStudentsCount: 0,
        averageProgress: 0,
        totalRevenue: 0,
        completionRate: 0,
        isMobile: false,
        onMakeAnnouncement: () => {},
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Mobile View',
      description: 'Compact metrics for mobile devices',
      props: {
        course: {
          id: 90001,
          title: "Introduction to Web Development",
          description: "Learn HTML, CSS, and JavaScript",
          instructor_id: 90001,
          instructor_name: "Dr. Emily Watson",
          instructor_avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          category_id: 1,
          price: 79.99,
          thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          cover_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800",
          duration_weeks: 8,
          level: "Beginner",
          status: "published",
          state: "published",
          enrollment_count: 42,
          rating: 4.7,
          review_count: 15,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        enrolledStudentsCount: 42,
        averageProgress: 68,
        totalRevenue: 3359.58,
        completionRate: 85,
        isMobile: true,
        onMakeAnnouncement: () => {},
      },
      status: 'prod',
      category: 'layout',
    },
  ],
}
