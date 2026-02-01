import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from '../registry/types'

interface TeacherSidebarProps {
  authenticated_user: {
    id: number
    name: string
    bio: string
    credentials: string
    specializations: string[]
    avatar_url?: string
    timezone?: string
    role: "teacher" | "student"
    email: string
  }
  onNavigate?: () => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

const teacherSidebarMeta: GalleryComponentMeta = {
    id: 'platform/teacher-sidebar',
  sourceId: '@/platform/components/TeacherSidebar#TeacherSidebar',
  status: 'archive',
}

export const teacherSidebarGalleryEntry: GalleryEntry<TeacherSidebarProps> = {
  name: 'TeacherSidebar',
  importPath: teacherSidebarMeta.sourceId.split('#')[0],
  category: 'Platform',
  id: 'platform/teacher-sidebar',
  layoutSize: 'full',
  variants: [
    {
      name: 'Default Expanded',
      description: 'Teacher sidebar in expanded state',
      props: {
        authenticated_user: {
          id: 90001,
          name: "Dr. Emily Watson",
          email: "emily.watson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          bio: "Computer Science professor",
          credentials: "PhD in Computer Science",
          specializations: ["Software Engineering", "Algorithms"],
          timezone: "America/New_York",
          role: "teacher",
        },
        isCollapsed: false,
        onNavigate: () => {},
        onToggleCollapse: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Collapsed',
      description: 'Teacher sidebar in collapsed state',
      props: {
        authenticated_user: {
          id: 90001,
          name: "Dr. Emily Watson",
          email: "emily.watson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          bio: "Computer Science professor",
          credentials: "PhD in Computer Science",
          specializations: ["Software Engineering"],
          timezone: "America/New_York",
          role: "teacher",
        },
        isCollapsed: true,
        onNavigate: () => {},
        onToggleCollapse: () => {},
      },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'With Notifications',
      description: 'Sidebar with unread message badges',
      props: {
        authenticated_user: {
          id: 90001,
          name: "Dr. Emily Watson",
          email: "emily.watson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
          bio: "Computer Science professor",
          credentials: "PhD in Computer Science",
          specializations: ["Software Engineering", "Algorithms"],
          timezone: "America/New_York",
          role: "teacher",
        },
        isCollapsed: false,
        onNavigate: () => {},
        onToggleCollapse: () => {},
      },
      status: 'archive',
      category: 'state',
    },
  ],
}
