import { router } from "@thicket/shims/inertia-react"
import { Briefcase, GraduationCap, Heart, MessageCircle, Users } from "lucide-react"
import { useState } from "react"

import { SocialLinks } from "@thicket/components/social-links"
import { Badge } from "@thicket/components/ui/badge"
import { Button } from "@thicket/components/ui/button"
import { ImagePlaceholder } from "@thicket/components/ui/image-placeholder"
import {
  followTeacher,
  unfollowTeacher,
  type EducationEntry,
  type TeachingExperienceEntry,
} from "@thicket/data/instructors"
import type { AuthenticatedUser } from "@thicket/platform/types"
import type { AuthorProfile } from "@thicket/types"

interface TeacherProfileHeroProps {
  teacher: AuthorProfile
  education: EducationEntry[]
  teachingExperience: TeachingExperienceEntry[]
  socialLinks?: {
    twitter?: string
    linkedin?: string
    website?: string
  }
  totalStudentsCount: number
  publishedCoursesCount: number
  authenticated_user?: AuthenticatedUser
  isFollowing?: boolean
  followerCount: number
}

export function TeacherProfileHero({
  teacher,
  education,
  teachingExperience,
  socialLinks,
  totalStudentsCount,
  publishedCoursesCount,
  authenticated_user,
  isFollowing: initialIsFollowing = false,
  followerCount: initialFollowerCount = 0,
}: TeacherProfileHeroProps) {
  const canMessage = authenticated_user?.role === "student"
  const canFollow = authenticated_user?.role === "student"

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleMessageClick = () => {
    router.visit(`/student/messages?instructor=${teacher.id}`)
  }

  const handleSignInClick = () => {
    router.visit("/sessions/new")
  }

  const handleFollowClick = () => {
    if (!authenticated_user || isUpdating) return

    setIsUpdating(true)

    if (isFollowing) {
      const success = unfollowTeacher(authenticated_user.id, teacher.id)
      if (success) {
        setIsFollowing(false)
        setFollowerCount((prev) => Math.max(0, prev - 1))
      }
    } else {
      const success = followTeacher(authenticated_user.id, teacher.id)
      if (success) {
        setIsFollowing(true)
        setFollowerCount((prev) => prev + 1)
      }
    }

    setIsUpdating(false)
  }

  return (
    <div className="bg-surface-50 border-default shadow-card rounded-2xl border p-8">
      {/* Top section: Avatar + Basic Info */}
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-6">
        {/* Large Avatar */}
        <div className="border-default bg-surface-100 h-32 w-32 shrink-0 overflow-hidden rounded-full border-4">
          {!teacher.avatar_url ? (
            <ImagePlaceholder
              type="instructor"
              size="lg"
              className="h-full w-full rounded-full"
            />
          ) : (
            <img
              src={teacher.avatar_url}
              alt={teacher.name}
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {/* Name, Credentials, Bio */}
        <div className="flex-1 min-w-0">
          <h1 className="text-foreground font-display text-3xl font-bold">
            {teacher.name}
          </h1>
          {teacher.credentials && (
            <p className="text-muted-foreground mt-1 text-lg">
              {teacher.credentials}
            </p>
          )}

          {teacher.bio && (
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              {teacher.bio}
            </p>
          )}

          {/* Specializations */}
          {teacher.specializations && teacher.specializations.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
              {teacher.specializations.map((spec, index) => (
                <Badge key={index} variant="brand" size="md">
                  {spec}
                </Badge>
              ))}
            </div>
          )}

          {/* Social Links */}
          {socialLinks && (
            <SocialLinks
              twitter={socialLinks.twitter}
              linkedin={socialLinks.linkedin}
              website={socialLinks.website}
              variant="default"
              className="mt-4 justify-center sm:justify-start"
            />
          )}

          {/* Action Buttons: Follow + Message grouped together */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center sm:justify-start">
            {/* Follow Button */}
            {canFollow && (
              <Button
                variant={isFollowing ? "outline" : "brand"}
                size="md"
                onClick={handleFollowClick}
                disabled={isUpdating}
              >
                <Heart
                  className={`mr-2 h-4 w-4 ${isFollowing ? "fill-current" : ""}`}
                />
                {isFollowing ? "Following" : "Follow"}
              </Button>
            )}

            {/* Message Button */}
            {canMessage && (
              <Button variant="secondary" size="md" onClick={handleMessageClick}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Message
              </Button>
            )}

            {/* Sign in prompts for unauthenticated users */}
            {!authenticated_user && (
              <>
                <Button
                  variant="brand"
                  size="md"
                  onClick={handleSignInClick}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Follow
                </Button>
                <Button variant="secondary" size="md" onClick={handleSignInClick}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Education & Teaching Experience Section */}
      {(education.length > 0 || teachingExperience.length > 0) && (
        <div className="border-subtle mt-8 border-t pt-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Education */}
            {education.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <GraduationCap className="text-brand-600 h-5 w-5" />
                  <h3 className="text-foreground text-sm font-semibold uppercase tracking-wide">
                    Education
                  </h3>
                </div>
                <div className="space-y-3">
                  {education.map((edu, index) => (
                    <div key={index}>
                      <p className="text-foreground font-medium">
                        {edu.degree} in {edu.field}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {edu.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Teaching Experience */}
            {teachingExperience.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Briefcase className="text-brand-600 h-5 w-5" />
                  <h3 className="text-foreground text-sm font-semibold uppercase tracking-wide">
                    Teaching Experience
                  </h3>
                </div>
                <div className="space-y-3">
                  {teachingExperience.map((exp, index) => (
                    <div key={index}>
                      <p className="text-foreground font-medium">
                        {exp.position} of {exp.field}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {exp.institution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="border-subtle mt-8 flex items-center justify-center gap-8 border-t pt-6 sm:justify-start">
        <div className="text-center sm:text-left">
          <p className="text-foreground text-2xl font-bold">{publishedCoursesCount}</p>
          <p className="text-muted-foreground text-sm">
            {publishedCoursesCount === 1 ? "Course" : "Courses"}
          </p>
        </div>
        <div className="border-subtle h-10 border-l"></div>
        <div className="text-center sm:text-left">
          <p className="text-foreground text-2xl font-bold">{totalStudentsCount}</p>
          <p className="text-muted-foreground text-sm">
            {totalStudentsCount === 1 ? "Student" : "Students"}
          </p>
        </div>
        <div className="border-subtle h-10 border-l"></div>
        <div className="text-center sm:text-left">
          <div className="flex items-center gap-1.5">
            <Users className="text-muted-foreground h-5 w-5" />
            <p className="text-foreground text-2xl font-bold">{followerCount}</p>
          </div>
          <p className="text-muted-foreground text-sm">
            {followerCount === 1 ? "Follower" : "Followers"}
          </p>
        </div>
      </div>
    </div>
  )
}
