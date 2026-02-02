import { Link, router } from "../shims/inertia-react"
import { track } from "@plausible-analytics/tracker"
import { GraduationCap } from "lucide-react"

import { PlatformOutputs } from "./platform-outputs"
import { Badge } from "./ui/badge"
import { ImagePlaceholder } from "./ui/image-placeholder"
import { CourseCTA } from "../platform/CTAs/CourseCTA"
import type { EducationEntry } from "../data/instructors"
import type { AuthenticatedUser } from "../platform/types"
import type { AuthorProfile, Course } from "../types"
import { teacher_profile_path } from "../routes"

/**
 * Variant types for InstructorSidebarCard component
 *
 * @typedef {string} InstructorCardVariant
 * @property {"public"} public - Public course landing page (show enroll button, hide platform features)
 * @property {"student"} student - Student enrolled view (show message button, hide platform features)
 * @property {"teacher"} teacher - Teacher course management (hide button and platform features)
 * @property {"preview"} preview - Course builder preview (minimal, hide button and platform features)
 */
export type InstructorCardVariant = "public" | "student" | "teacher" | "preview"

interface InstructorSidebarCardProps {
  instructor: AuthorProfile
  course: Course
  /**
   * Visual variant that controls which sections and buttons are displayed
   * - "public": Public marketing page with enroll button
   * - "student": Enrolled student view with message button
   * - "teacher": Teacher management view with no action button
   * - "preview": Builder preview with minimal chrome
   */
  variant?: InstructorCardVariant
  isMobile?: boolean
  authenticated_user?: AuthenticatedUser
  is_enrolled?: boolean
  onEnrollClick?: () => void
  /**
   * @deprecated Use variant="student" instead
   */
  showEnrolledView?: boolean
  education?: EducationEntry[]
  /**
   * @deprecated Platform features are now hidden by default. Use variant prop to control visibility.
   */
  showPlatformFeatures?: boolean
}

export function InstructorSidebarCard({
  instructor,
  course,
  variant,
  isMobile = false,
  authenticated_user,
  is_enrolled = false,
  onEnrollClick,
  showEnrolledView = false,
  education,
  showPlatformFeatures = true,
}: InstructorSidebarCardProps) {
  // Derive effective variant from props (new variant prop takes precedence)
  const effectiveVariant: InstructorCardVariant = variant || (
    showEnrolledView ? "student" :
    showPlatformFeatures === false ? "public" :
    "public" // default fallback
  )

  // Helper: Should we show platform features section?
  const shouldShowPlatformFeatures = (): boolean => {
    // Variant-based logic (all variants hide platform features for now)
    if (variant) {
      return false // Hidden in all variants currently
    }
    // Legacy fallback
    return showPlatformFeatures
  }

  // Helper: Should we show action button?
  const shouldShowActionButton = (): boolean => {
    return effectiveVariant === "public" || effectiveVariant === "student"
  }
  const handleEnroll = () => {
    if (course.state === "published") {
      track("course_page_enroll_clicked", { props: { course: course.title } })
      if (onEnrollClick) {
        onEnrollClick()
      }
    } else {
      track("course_page_join_cta_clicked", { props: { course: course.title } })
    }
  }

  const handleWriteMessage = () => {
    router.visit(`/student/messages?instructor=${instructor.id}`)
  }

  // Determine role for CourseCTA
  const ctaRole = effectiveVariant === "student" ? "student" : effectiveVariant === "teacher" ? "teacher" : "public"
  return (
    <div className={isMobile ? "" : "sticky top-8"}>
      <div className="bg-surface-50 border-default shadow-card rounded-xl border p-6">
        <h3 className="text-foreground font-display mb-4 text-lg font-bold">
          Your Instructor
        </h3>

        <div className="mb-4 flex items-start gap-4">
          <div className="border-default bg-surface-100 h-16 w-16 shrink-0 overflow-hidden rounded-full border-2">
            {!instructor.avatar_url ? (
              <ImagePlaceholder
                type="instructor"
                size="md"
                className="rounded-full"
              />
            ) : (
              <img
                src={instructor.avatar_url}
                alt={instructor.name}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <Link
              href={teacher_profile_path(instructor.id)}
              className="text-foreground hover:text-brand-600 text-base font-semibold transition-colors"
            >
              {instructor.name}
            </Link>
            {instructor.credentials && (
              <p className="text-muted-foreground mt-1 text-xs">
                {instructor.credentials}
              </p>
            )}
          </div>
        </div>

        {instructor.bio && (
          <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
            {instructor.bio}
          </p>
        )}

        {instructor.specializations && (
          <div className="border-subtle mb-4 border-b pb-4">
            <div className="flex flex-wrap gap-2">
              {instructor.specializations.map((spec, index) => (
                <Badge key={index} variant="default" size="md">
                  {spec}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {education && education.length > 0 && (
          <div className="border-subtle mb-4 border-b pb-4">
            <div className="mb-2 flex items-center gap-2">
              <GraduationCap className="text-muted-foreground h-4 w-4" />
              <h4 className="text-foreground text-xs font-semibold uppercase tracking-wide">
                Education
              </h4>
            </div>
            <div className="space-y-2">
              {education.map((edu, index) => (
                <div key={index} className="text-muted-foreground text-sm leading-relaxed">
                  <span className="font-semibold">{edu.degree}</span> in {edu.field}
                  <div className="text-muted text-xs">{edu.institution}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {shouldShowPlatformFeatures() && (
          <div className="border-subtle mb-4 border-b pb-4">
            <h4 className="text-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
              Platform Features
            </h4>
            <PlatformOutputs variant="minimal" />
          </div>
        )}

        {!isMobile && shouldShowActionButton() && effectiveVariant !== "student" && (
          <CourseCTA
            course={course}
            role={ctaRole}
            variant="sidebar"
            authenticated_user={authenticated_user}
            is_enrolled={is_enrolled}
            onEnrollClick={handleEnroll}
            size="md"
          />
        )}
        {!isMobile && shouldShowActionButton() && effectiveVariant === "student" && (
          <button
            onClick={handleWriteMessage}
            className="px-6 py-3 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
          >
            Write a Message
          </button>
        )}
      </div>

      {isMobile && shouldShowActionButton() && effectiveVariant !== "student" && (
        <div className="border-default bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-50 border-t p-4 shadow-xl backdrop-blur-sm lg:hidden">
          <div className="mx-auto max-w-7xl px-4">
            <CourseCTA
              course={course}
              role={ctaRole}
              variant="sidebar"
              authenticated_user={authenticated_user}
              is_enrolled={is_enrolled}
              onEnrollClick={handleEnroll}
              size="md"
              fullWidth
            />
          </div>
        </div>
      )}
      {isMobile && shouldShowActionButton() && effectiveVariant === "student" && (
        <div className="border-default bg-surface/95 pb-safe fixed inset-x-0 bottom-0 z-50 border-t p-4 shadow-xl backdrop-blur-sm lg:hidden">
          <div className="mx-auto max-w-7xl px-4">
            <button
              onClick={handleWriteMessage}
              className="w-full px-6 py-3 text-sm font-medium rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            >
              Write a Message
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
