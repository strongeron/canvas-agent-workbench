import { Check } from "lucide-react"

interface LearningObjectivesListProps {
  objectives: string[]
}

export function LearningObjectivesList({
  objectives,
}: LearningObjectivesListProps) {
  if (!objectives || objectives.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {objectives.map((objective, index) => (
        <div key={index} className="flex items-start gap-3">
          <div className="bg-brand-100 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
            <Check className="text-brand-700 h-4 w-4" />
          </div>
          <p className="text-muted-foreground text-base leading-relaxed">
            {objective}
          </p>
        </div>
      ))}
    </div>
  )
}
