import { UserAvatar } from "@thicket/components/ui/user-avatar"
import type { Recipient } from "@thicket/platform/hooks/useMessageComposer"

interface RecipientSelectorProps {
  recipients: Recipient[]
  instructorRecipients?: Recipient[]
  studentRecipients?: Recipient[]
  selectedRecipientId: number | null
  onSelectRecipient: (id: number) => void
  disabled?: boolean
  showSections?: boolean
}

export function RecipientSelector({
  recipients,
  instructorRecipients = [],
  studentRecipients = [],
  selectedRecipientId,
  onSelectRecipient,
  disabled = false,
  showSections = false,
}: RecipientSelectorProps) {
  if (recipients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-default bg-surface-50 p-4 text-center">
        <p className="text-muted-foreground text-sm">No recipients available for this course</p>
      </div>
    )
  }

  if (showSections && (instructorRecipients.length > 0 || studentRecipients.length > 0)) {
    return (
      <div>
        <label className="text-foreground mb-2 block text-sm font-medium">To</label>
        <div className="space-y-3">
          {instructorRecipients.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
                Instructor
              </p>
              <div className="space-y-2">
                {instructorRecipients.map((recipient) => (
                  <RecipientButton
                    key={`instructor-${recipient.id}`}
                    recipient={recipient}
                    isSelected={selectedRecipientId === recipient.id}
                    onClick={() => onSelectRecipient(recipient.id)}
                    disabled={disabled}
                    showTeacherBadge={true}
                  />
                ))}
              </div>
            </div>
          )}

          {studentRecipients.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
                {instructorRecipients.length > 0 ? "Classmates" : "Students"} ({studentRecipients.length})
              </p>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-default bg-surface-50 p-2">
                {studentRecipients.map((recipient) => (
                  <RecipientButton
                    key={`student-${recipient.id}`}
                    recipient={recipient}
                    isSelected={selectedRecipientId === recipient.id}
                    onClick={() => onSelectRecipient(recipient.id)}
                    disabled={disabled}
                    showTeacherBadge={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <label className="text-foreground mb-2 block text-sm font-medium">Select Recipient</label>
      <p className="mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
        Enrolled Students ({recipients.length})
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-default bg-surface-50 p-2">
        {recipients.map((recipient) => (
          <RecipientButton
            key={recipient.id}
            recipient={recipient}
            isSelected={selectedRecipientId === recipient.id}
            onClick={() => onSelectRecipient(recipient.id)}
            disabled={disabled}
            showTeacherBadge={recipient.type === "teacher"}
          />
        ))}
      </div>
    </div>
  )
}

interface RecipientButtonProps {
  recipient: Recipient
  isSelected: boolean
  onClick: () => void
  disabled: boolean
  showTeacherBadge: boolean
}

function RecipientButton({
  recipient,
  isSelected,
  onClick,
  disabled,
  showTeacherBadge,
}: RecipientButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
          : "border-default bg-white hover:border-surface-300 hover:bg-surface-50"
      }`}
    >
      <UserAvatar
        src={recipient.avatar_url}
        alt={recipient.name}
        size="md"
        showTeacherBadge={showTeacherBadge}
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground text-sm font-semibold truncate">{recipient.name}</p>
        {showTeacherBadge ? (
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 mt-1">
            Instructor
          </span>
        ) : (
          <p className="text-muted-foreground text-xs">Student</p>
        )}
      </div>
    </button>
  )
}
