import type { ProgressSteps } from '@thicket/platform/CourseBuilder/ProgressSteps'

import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'
import type { GalleryEntry } from '../../registry/types'

type ProgressStepsProps = React.ComponentProps<typeof ProgressSteps>

export const progressStepsMeta: GalleryComponentMeta = {
  id: 'teacher/progress-steps',
  sourceId: '@thicket/platform/CourseBuilder/ProgressSteps#ProgressSteps',
  status: 'prod',
}

export const progressStepsGalleryEntry: GalleryEntry<ProgressStepsProps> = {
  id: progressStepsMeta.id,
  name: 'ProgressSteps',
  importPath: progressStepsMeta.sourceId.split('#')[0],
  category: 'Course Management',
  layoutSize: 'full',
  meta: progressStepsMeta,
  variants: [
    {
      name: 'Design Step Active (Start)',
      description: 'Initial state - design step active, others not accessible',
      props: {
        currentStep: 'design',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: false,
        canNavigateToPublish: false,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Design Step Active (Can Continue)',
      description: 'Design complete - can navigate to preview step',
      props: {
        currentStep: 'design',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: true,
        canNavigateToPublish: false,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Preview Step Active',
      description: 'Preview step active - design completed, publish not yet accessible',
      props: {
        currentStep: 'preview',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: true,
        canNavigateToPublish: false,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Preview Step Active (Can Continue)',
      description: 'Preview step active - all validations passed, can proceed to publish',
      props: {
        currentStep: 'preview',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: true,
        canNavigateToPublish: true,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Publish Step Active',
      description: 'Final publish step active - all previous steps completed',
      props: {
        currentStep: 'publish',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: true,
        canNavigateToPublish: true,
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'All Steps Clickable',
      description: 'User can navigate freely between all completed steps',
      props: {
        currentStep: 'publish',
        onStepClick: (step) => console.log('Navigate to:', step),
        canNavigateToPreview: true,
        canNavigateToPublish: true,
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
