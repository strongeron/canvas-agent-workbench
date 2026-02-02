import { type ChangeEvent } from "react"

import { Input } from "../../components/ui/input"
import { Select } from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
import type { Category } from "../../types"

interface CourseInfoFormProps {
  title: string
  description: string
  categoryId: number | null
  categories: Category[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCategoryChange: (value: number) => void
  errors: {
    title?: string
    description?: string
    category?: string
  }
}

export function CourseInfoForm({
  title,
  description,
  categoryId,
  categories,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  errors,
}: CourseInfoFormProps) {
  const descriptionWordCount = description.trim().split(/\s+/).filter(Boolean).length
  const maxWords = 50

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    const words = text.trim().split(/\s+/).filter(Boolean)
    if (words.length <= maxWords) {
      onDescriptionChange(text)
    }
  }

  const categoryOptions = categories.map(category => ({
    value: category.id.toString(),
    label: category.name,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-foreground mb-4 text-xl font-bold">
          Course Information
        </h2>

        <div className="space-y-5">
          <Input
            label="Course Title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter your course title"
            error={errors.title}
            maxLength={100}
          />

          <Textarea
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Write a compelling description for your course"
            rows={4}
            error={errors.description}
            helperText={`Keep it concise and engaging (${descriptionWordCount}/${maxWords} words)`}
            characterCount={{
              current: descriptionWordCount,
              max: maxWords,
            }}
          />

          <Select
            label="Category"
            value={categoryId?.toString() || ""}
            onChange={(value) => value && onCategoryChange(parseInt(value))}
            error={errors.category}
            placeholder="Select a category"
            options={categoryOptions}
          />
        </div>
      </div>
    </div>
  )
}
