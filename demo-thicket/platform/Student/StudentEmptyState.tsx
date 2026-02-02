import { Link } from "../../shims/inertia-react"
import { BookOpen, Sparkles } from "lucide-react"

import { Button } from "../../components/ui/button"

export interface StudentEmptyStateProps {
  studentName: string
  studentId: number
  basePath?: string
}

export function StudentEmptyState({ studentName, studentId: _studentId, basePath = "/student" }: StudentEmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-surface-200 bg-surface-50 p-12 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-brand-50">
        <BookOpen className="h-10 w-10 text-brand-600" />
      </div>

      <h2 className="font-display text-foreground mb-3 text-2xl font-bold">
        Welcome to Thicket, {studentName}!
      </h2>

      <p className="text-muted-foreground mx-auto mb-8 max-w-md text-lg">
        {"You haven't enrolled in any courses yet. Explore our catalog to find courses that interest you."}
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link href={`${basePath}/browse-courses`}>
          <Button variant="brand" size="lg">
            <Sparkles className="mr-2 h-5 w-5" />
            Browse Courses
          </Button>
        </Link>
      </div>
    </div>
  )
}
