import type { LucideIcon } from "lucide-react"
import { Download, FileText, Upload } from "lucide-react"

import { Button } from "@thicket/components/ui/button"
import type { Assignment } from "@thicket/types"

export type AssignmentCTARole = "student" | "teacher"
export type AssignmentCTAAction = "submit" | "view" | "upload" | "download"
export type AssignmentCTAStatus = "pending" | "submitted" | "graded"

interface AssignmentCTAConfig {
  show: boolean
  text: string
  icon?: LucideIcon
  variant: "brand" | "secondary" | "ghost" | "outline"
  href?: string
  onClick?: () => void
  disabled?: boolean
}

interface GetAssignmentCTAConfigParams {
  assignment: Assignment
  status?: AssignmentCTAStatus
  role: AssignmentCTARole
  action?: AssignmentCTAAction
  onDownload?: (assignment: Assignment) => void
  onUpload?: (assignment: Assignment) => void
  onSubmit?: (assignment: Assignment) => void
}

export function getAssignmentCTAConfig({
  assignment,
  status: _status,
  role,
  action,
  onDownload,
  onUpload,
  onSubmit,
}: GetAssignmentCTAConfigParams): AssignmentCTAConfig {
  // Teacher role: view or download
  if (role === "teacher") {
    if (action === "download" && assignment.file_url && onDownload) {
      return {
        show: true,
        text: "Download",
        icon: Download,
        variant: "secondary",
        onClick: () => onDownload(assignment),
      }
    }

    return {
      show: true,
      text: "View Assignment",
      icon: FileText,
      variant: "outline",
      href: assignment.file_url || undefined,
    }
  }

  // Student role
  if (action === "download" && assignment.file_url && onDownload) {
    return {
      show: true,
      text: "Download",
      icon: Download,
      variant: "secondary",
      onClick: () => onDownload(assignment),
    }
  }

  if (action === "upload" && onUpload) {
    return {
      show: true,
      text: "Upload Assignment",
      icon: Upload,
      variant: "brand",
      onClick: () => onUpload(assignment),
    }
  }

  if (action === "submit" && onSubmit) {
    return {
      show: true,
      text: "Submit Assignment",
      icon: Upload,
      variant: "brand",
      onClick: () => onSubmit(assignment),
    }
  }

  if (action === "view") {
    return {
      show: true,
      text: "View Assignment",
      icon: FileText,
      variant: "outline",
      href: assignment.file_url || undefined,
    }
  }

  // Default: no button
  return {
    show: false,
    text: "",
    variant: "ghost",
  }
}

export interface AssignmentCTAProps {
  assignment: Assignment
  status?: AssignmentCTAStatus
  role: AssignmentCTARole
  action?: AssignmentCTAAction
  onDownload?: (assignment: Assignment) => void
  onUpload?: (assignment: Assignment) => void
  onSubmit?: (assignment: Assignment) => void
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  className?: string
}

export function AssignmentCTA({
  assignment,
  status,
  role,
  action,
  onDownload,
  onUpload,
  onSubmit,
  size = "md",
  fullWidth,
  className = "",
}: AssignmentCTAProps) {
  const config = getAssignmentCTAConfig({
    assignment,
    status,
    role,
    action,
    onDownload,
    onUpload,
    onSubmit,
  })

  if (!config.show) {
    return null
  }

  const buttonProps = {
    variant: config.variant,
    size,
    fullWidth,
    className,
    icon: config.icon,
    disabled: config.disabled,
    rounded: "lg" as const,
  }

  if (config.href) {
    return (
      <a href={config.href} target="_blank" rel="noopener noreferrer" className={fullWidth ? "w-full" : ""}>
        <Button {...buttonProps}>{config.text}</Button>
      </a>
    )
  }

  if (config.onClick) {
    return (
      <Button {...buttonProps} onClick={config.onClick}>
        {config.text}
      </Button>
    )
  }

  return (
    <Button {...buttonProps}>
      {config.text}
    </Button>
  )
}

