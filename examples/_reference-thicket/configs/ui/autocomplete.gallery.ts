import type { ComponentProps } from 'react'
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import type { Autocomplete } from "@/components/ui/autocomplete"

type AutocompleteProps = ComponentProps<typeof Autocomplete>

export const autocompleteMeta: GalleryComponentMeta = {
  id: 'ui/autocomplete',
  sourceId: '@/components/ui/autocomplete#Autocomplete',
  status: 'prod',
}

export const autocompleteGalleryEntry: GalleryEntry<AutocompleteProps> = {
  name: 'Autocomplete',
  importPath: autocompleteMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: autocompleteMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: autocompleteMeta,
  variants: [
    {
      name: 'Empty',
      description: 'Autocomplete without value showing placeholder',
      props: { value: '', onChange: () => {}, suggestions: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'History', 'Literature', 'Philosophy'], placeholder: 'Start typing to search subjects...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'With Value',
      description: 'Autocomplete with selected value typed in',
      props: { value: 'Mathematics', onChange: () => {}, suggestions: ['Mathematics', 'Mathematics Education', 'Applied Mathematics'], placeholder: 'Select a subject...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Partial Input',
      description: 'Autocomplete with partial text showing filtered suggestions',
      props: { value: 'Phys', onChange: () => {}, suggestions: ['Physics', 'Physical Education', 'Physiology'], placeholder: 'Type to search...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Long Suggestions List',
      description: 'Autocomplete with many suggestions demonstrating scroll',
      props: { value: '', onChange: () => {}, suggestions: ['Ancient History', 'Art History', 'Biology', 'Chemistry', 'Computer Science', 'Economics', 'English Literature', 'Environmental Science', 'Geography', 'History', 'Mathematics', 'Modern Languages', 'Music Theory', 'Philosophy', 'Physics', 'Political Science', 'Psychology', 'Sociology', 'Statistics', 'World History'], placeholder: 'Search all subjects...' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'No Matching Results',
      description: 'Autocomplete with empty suggestions array',
      props: { value: 'Quantum Mechanics', onChange: () => {}, suggestions: [], placeholder: 'Type to search...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Single Suggestion',
      description: 'Autocomplete narrowed down to one match',
      props: { value: 'Computer Sci', onChange: () => {}, suggestions: ['Computer Science'], placeholder: 'Type to search...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled autocomplete with grayed out styling',
      props: { value: 'Physics', onChange: () => {}, suggestions: [], disabled: true, placeholder: 'Select a subject...' },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Institution Names',
      description: 'Autocomplete for searching institution names',
      props: { value: '', onChange: () => {}, suggestions: ['Harvard University', 'MIT', 'Stanford University', 'Yale University', 'Princeton University', 'Columbia University', 'University of Chicago', 'University of Pennsylvania'], placeholder: 'Search institutions...' },
      status: 'prod',
      category: 'variant',
    },
  ],
}
