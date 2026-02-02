import type { LearningObjectivesForm } from "../../platform/CourseBuilder/LearningObjectivesForm"
import type { GalleryEntry } from "../../platform/gallery/registry/types"
import type { GalleryComponentMeta } from "../../platform/gallery/types"

type LearningObjectivesFormProps = React.ComponentProps<typeof LearningObjectivesForm>

const learningObjectivesFormMeta: GalleryComponentMeta = {
  id: "course-builder/learning-objectives-form",
  sourceId: "../../platform/CourseBuilder/LearningObjectivesForm#LearningObjectivesForm",
  status: 'prod',
}

export const learningObjectivesFormGalleryEntry: GalleryEntry<LearningObjectivesFormProps> = {
  name: 'LearningObjectivesForm',
  importPath: '../../platform/CourseBuilder/LearningObjectivesForm',
  category: 'Course Management',
  id: learningObjectivesFormMeta.id,
  meta: learningObjectivesFormMeta,
  layoutSize: 'full',
  variants: [
    {
      name: 'Empty State',
      description: 'Form with no objectives added yet - shows helpful guidance',
      props: {
        objectives: [],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Single Objective',
      description: 'Form with one learning objective added',
      props: {
        objectives: [
          'Understand the fundamentals of web development',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Two Objectives',
      description: 'Form with two learning objectives showing minimal list',
      props: {
        objectives: [
          'Master HTML5 and CSS3 fundamentals',
          'Build responsive layouts with Flexbox and Grid',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Few Objectives',
      description: 'Form with 3-4 learning objectives (typical course)',
      props: {
        objectives: [
          'Understand React hooks and component lifecycle',
          'Build responsive user interfaces with modern CSS',
          'Implement state management patterns',
          'Create reusable component libraries',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Full List',
      description: 'Form with comprehensive list of 6 objectives',
      props: {
        objectives: [
          'Master TypeScript fundamentals and advanced types',
          'Build scalable Node.js backend applications',
          'Design RESTful APIs following best practices',
          'Implement authentication and authorization',
          'Work with SQL and NoSQL databases',
          'Deploy applications to production environments',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Many Objectives',
      description: 'Form with extensive list showing scrolling behavior',
      props: {
        objectives: [
          'Understand core programming concepts and syntax',
          'Master data structures and algorithms',
          'Build object-oriented applications',
          'Implement functional programming patterns',
          'Work with APIs and external services',
          'Handle errors and edge cases gracefully',
          'Write clean, maintainable code',
          'Debug and test applications effectively',
          'Optimize code performance',
          'Deploy and maintain production systems',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Long Text Objective',
      description: 'Form with objectives containing long, detailed descriptions',
      props: {
        objectives: [
          'Develop a comprehensive understanding of modern software architecture patterns including microservices, event-driven systems, and serverless computing',
          'Master advanced database design principles and optimization techniques for both relational and non-relational database systems',
          'Build scalable, secure, and maintainable applications using industry-standard tools and frameworks',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Mixed Length Objectives',
      description: 'Form with mixture of short and long objective statements',
      props: {
        objectives: [
          'Learn JavaScript basics',
          'Understand asynchronous programming patterns including promises, async/await, and event loops',
          'Build web applications',
          'Implement comprehensive error handling and logging strategies across frontend and backend systems',
          'Deploy to cloud',
        ],
        onChange: (objectives) => console.log('Objectives:', objectives),
      },
      status: 'prod',
      category: 'variant',
    },
  ],
}
