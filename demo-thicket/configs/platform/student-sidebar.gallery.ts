import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

interface StudentSidebarProps {
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

const studentSidebarMeta: GalleryComponentMeta = {
    id: 'platform/student-sidebar',
  sourceId: '@thicket/platform/StudentSidebar#StudentSidebar',
  status: 'archive',
}

export const studentSidebarGalleryEntry: GalleryEntry<StudentSidebarProps> = {
  name: 'StudentSidebar',
  importPath: studentSidebarMeta.sourceId.split('#')[0],
  category: 'Platform',
  id: 'platform/student-sidebar',
  layoutSize: 'full',
  variants: [
    {
      name: 'Default Expanded',
      description: 'Student sidebar in expanded state',
      props: {
        authenticated_user: {
          id: 90002,
          name: "Alex Thompson",
          email: "alex.thompson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
          bio: "Passionate learner",
          credentials: "",
          specializations: [],
          timezone: "America/New_York",
          role: "student",
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
      description: 'Student sidebar in collapsed state',
      props: {
        authenticated_user: {
          id: 90002,
          name: "Alex Thompson",
          email: "alex.thompson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
          bio: "Passionate learner",
          credentials: "",
          specializations: [],
          timezone: "America/New_York",
          role: "student",
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
      description: 'Sidebar with unread question badges',
      props: {
        authenticated_user: {
          id: 90002,
          name: "Alex Thompson",
          email: "alex.thompson@example.com",
          avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
          bio: "Passionate learner",
          credentials: "",
          specializations: [],
          timezone: "America/New_York",
          role: "student",
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
