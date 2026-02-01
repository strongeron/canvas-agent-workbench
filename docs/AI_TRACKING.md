# AI Generation Tracking

Track the evolution of AI-generated components through your design iterations.

## Overview

The gallery POC includes built-in support for tracking AI-generated components via the `AIGenerationMeta` type. This allows you to:

- Track when components were generated
- Store the prompts that created them
- Record which AI model was used
- Track iteration numbers
- Link to parent versions
- Store human feedback

## Schema

```typescript
interface AIGenerationMeta {
  /** ISO timestamp when generated */
  generatedAt: string

  /** The prompt/instruction that created this */
  prompt?: string

  /** AI model used (e.g., "claude-opus-4", "gpt-4") */
  model?: string

  /** Iteration number (1 = first generation) */
  iteration: number

  /** Parent version ID if this is a refinement */
  parentVersionId?: string

  /** Human feedback about this version */
  feedback?: string

  /** Tags for categorization */
  tags?: string[]
}
```

## Usage in Gallery Configs

Add `aiMeta` to any variant:

```typescript
export const buttonGalleryEntry: GalleryEntry = {
  id: 'ui/button',
  name: 'Button',
  category: 'Base UI',
  importPath: '@/components/ui/button',
  variants: [
    {
      name: 'Primary Brand',
      description: 'Main CTA button with brand colors',
      props: { variant: 'brand', children: 'Get Started' },
      status: 'prod',
      category: 'variant',

      // AI Generation Tracking
      aiMeta: {
        generatedAt: '2024-01-15T10:30:00Z',
        prompt: 'Create a primary CTA button with brand colors',
        model: 'claude-opus-4',
        iteration: 3,
        parentVersionId: 'button-v2',
        feedback: 'Approved by design team',
        tags: ['cta', 'brand', 'marketing'],
      },
    },
  ],
}
```

## Tracking Workflow

### 1. Initial Generation

When AI generates a new component:

```typescript
aiMeta: {
  generatedAt: new Date().toISOString(),
  prompt: 'Create a card component for course listings',
  model: 'claude-opus-4',
  iteration: 1,
  tags: ['course', 'card', 'listing'],
}
```

### 2. Iteration/Refinement

When refining based on feedback:

```typescript
aiMeta: {
  generatedAt: new Date().toISOString(),
  prompt: 'Add hover effect and better spacing',
  model: 'claude-opus-4',
  iteration: 2,
  parentVersionId: 'course-card-v1',
  feedback: 'Previous version had tight spacing',
  tags: ['course', 'card', 'listing', 'refined'],
}
```

### 3. Human Approval

When approved for production:

```typescript
aiMeta: {
  generatedAt: '2024-01-15T10:30:00Z',
  prompt: 'Add hover effect and better spacing',
  model: 'claude-opus-4',
  iteration: 2,
  parentVersionId: 'course-card-v1',
  feedback: 'Approved by design team after review',
  tags: ['approved', 'production'],
}
```

## Querying AI Metadata

### Find all AI-generated variants

```typescript
function getAIGeneratedVariants(entries: GalleryEntry[]) {
  return entries.flatMap(entry =>
    entry.variants
      .filter(v => v.aiMeta)
      .map(v => ({
        componentId: entry.id,
        variantName: v.name,
        aiMeta: v.aiMeta,
      }))
  )
}
```

### Find variants by model

```typescript
function getVariantsByModel(entries: GalleryEntry[], model: string) {
  return getAIGeneratedVariants(entries)
    .filter(v => v.aiMeta?.model === model)
}
```

### Find iteration chains

```typescript
function getIterationChain(entries: GalleryEntry[], variantId: string) {
  const all = getAIGeneratedVariants(entries)
  const chain: typeof all = []

  let current = all.find(v => v.variantName === variantId)
  while (current) {
    chain.unshift(current)
    current = all.find(v =>
      v.variantName === current?.aiMeta?.parentVersionId
    )
  }

  return chain
}
```

### Get iteration statistics

```typescript
function getIterationStats(entries: GalleryEntry[]) {
  const variants = getAIGeneratedVariants(entries)

  return {
    total: variants.length,
    byModel: variants.reduce((acc, v) => {
      const model = v.aiMeta?.model || 'unknown'
      acc[model] = (acc[model] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    avgIterations: variants.reduce((sum, v) =>
      sum + (v.aiMeta?.iteration || 1), 0
    ) / variants.length,
    withFeedback: variants.filter(v => v.aiMeta?.feedback).length,
  }
}
```

## Best Practices

### 1. Always Include Generation Timestamp

```typescript
generatedAt: new Date().toISOString(),
```

### 2. Be Specific with Prompts

```typescript
// Good
prompt: 'Create a modal for course enrollment with pricing display and payment method selection'

// Not as useful
prompt: 'Create a modal'
```

### 3. Track Parent Versions

Always link to the previous version when iterating:

```typescript
parentVersionId: 'modal-enrollment-v2',
iteration: 3,
```

### 4. Use Meaningful Tags

```typescript
tags: ['enrollment', 'payment', 'modal', 'critical-path'],
```

### 5. Record Feedback

Document why changes were made:

```typescript
feedback: 'Added error states per design review. Reduced button count from 3 to 2.',
```

## Integration with Version Control

Consider storing a history file alongside your gallery configs:

```
src/platform/gallery/
├── configs/
│   └── ui/
│       ├── button.gallery.ts
│       └── button.history.json  # AI generation history
```

Example `button.history.json`:

```json
{
  "componentId": "ui/button",
  "versions": [
    {
      "id": "button-v1",
      "generatedAt": "2024-01-10T08:00:00Z",
      "prompt": "Create primary button component",
      "model": "claude-opus-4",
      "status": "archived"
    },
    {
      "id": "button-v2",
      "generatedAt": "2024-01-12T14:30:00Z",
      "prompt": "Add loading state and icon support",
      "model": "claude-opus-4",
      "parentVersionId": "button-v1",
      "status": "archived"
    },
    {
      "id": "button-v3",
      "generatedAt": "2024-01-15T10:30:00Z",
      "prompt": "Refine hover states and add size variants",
      "model": "claude-opus-4",
      "parentVersionId": "button-v2",
      "status": "production"
    }
  ]
}
```
