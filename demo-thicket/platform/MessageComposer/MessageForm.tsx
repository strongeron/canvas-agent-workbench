import { Input } from "@thicket/components/ui/input"
import { Textarea } from "@thicket/components/ui/textarea"

interface MessageFormProps {
  subject: string
  onSubjectChange: (value: string) => void
  body: string
  onBodyChange: (value: string) => void
  disabled?: boolean
  bodyRows?: number
  subjectPlaceholder?: string
  bodyPlaceholder?: string
}

export function MessageForm({
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  disabled = false,
  bodyRows = 8,
  subjectPlaceholder = "Enter message subject",
  bodyPlaceholder = "Type your message here...",
}: MessageFormProps) {
  return (
    <>
      <div>
        <label className="text-foreground mb-2 block text-sm font-medium">Subject</label>
        <Input
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder={subjectPlaceholder}
          disabled={disabled}
        />
      </div>

      <div>
        <label className="text-foreground mb-2 block text-sm font-medium">Message</label>
        <Textarea
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder={bodyPlaceholder}
          rows={bodyRows}
          disabled={disabled}
        />
      </div>
    </>
  )
}
