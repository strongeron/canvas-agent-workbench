import { router } from "@inertiajs/react"
import { BookOpen, DollarSign, Edit, Megaphone, TrendingUp, Users } from "lucide-react"

import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import type { Course } from "@thicket/types"

interface TeacherMetricsSidebarProps {
  course: Course
  enrolledStudentsCount: number
  averageProgress?: number
  totalRevenue?: number
  completionRate?: number
  isMobile?: boolean
  onMakeAnnouncement?: () => void
}

export function TeacherMetricsSidebar({
  course,
  enrolledStudentsCount,
  averageProgress = 0,
  totalRevenue = 0,
  completionRate: _completionRate = 0,
  isMobile = false,
  onMakeAnnouncement,
}: TeacherMetricsSidebarProps) {
  const handleEditCourse = () => {
    router.visit("/teacher/courses/builder", {
      data: { courseId: course.id },
    })
  }


  const getStateVariant = () => {
    switch (course.state) {
      case "published":
        return "brand-filled"
      case "draft":
        return "secondary"
      case "waitlist":
        return "brand-outline"
      default:
        return "secondary"
    }
  }

  return (
    <div className={isMobile ? "" : "sticky top-8"}>
      <div className="bg-gradient-to-br from-white via-white to-brand-50/30 border-default shadow-card rounded-xl border p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground font-display text-lg font-bold">
              Course Status
            </h3>
            <Badge variant={getStateVariant()} size="sm">
              {course.state.charAt(0).toUpperCase() + course.state.slice(1)}
            </Badge>
          </div>

          <div className="text-muted-foreground text-sm mb-4">
            Monitor your course performance and manage key aspects of your teaching.
          </div>
        </div>

        <div className="space-y-4 border-b border-default pb-6 mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-50/50 to-transparent rounded-t-lg -mx-6 -mt-4 h-[calc(100%+1rem)]" style={{zIndex: 0}} />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Enrolled Students</span>
            </div>
            <span className="text-foreground text-lg font-bold">{enrolledStudentsCount}</span>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span className="text-sm font-medium">Total Lessons</span>
            </div>
            <span className="text-foreground text-lg font-bold">
              {course.lessons_count || course.curriculum?.length || 0}
            </span>
          </div>

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <span className="text-foreground text-lg font-bold">
              ${totalRevenue.toLocaleString()}
            </span>
          </div>

          {averageProgress > 0 && (
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Avg Progress</span>
              </div>
              <span className="text-foreground text-lg font-bold">{averageProgress}%</span>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-6">
          <Button
            variant="brand"
            size="md"
            icon={Edit}
            onClick={handleEditCourse}
            fullWidth
          >
            Edit Course
          </Button>

          <Button
            variant="secondary"
            size="md"
            icon={Megaphone}
            onClick={onMakeAnnouncement}
            fullWidth
          >
            Make an Announcement
          </Button>
        </div>

    
      </div>
    </div>
  )
}
