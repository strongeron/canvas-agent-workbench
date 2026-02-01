import type { PricingForm } from "@/platform/components/CourseBuilder/PricingForm"
import type { GalleryEntry } from "../registry/types"
import type { GalleryComponentMeta } from "../registry/types"

type PricingFormProps = React.ComponentProps<typeof PricingForm>

const pricingFormMeta: GalleryComponentMeta = {
  id: "course-builder/pricing-form",
  sourceId: "@/platform/components/CourseBuilder/PricingForm#PricingForm",
  status: 'prod',
}

export const pricingFormGalleryEntry: GalleryEntry<PricingFormProps> = {
  name: 'PricingForm',
  importPath: '@/platform/components/CourseBuilder/PricingForm',
  category: 'Course Management',
  id: pricingFormMeta.id,
  meta: pricingFormMeta,
  layoutSize: 'full',
  variants: [
    {
      name: 'Empty State',
      description: 'Form with no price set and no lessons yet',
      props: {
        price: null,
        lessonsCount: 0,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'No Price Set (With Lessons)',
      description: 'Form with lessons but no price entered yet',
      props: {
        price: null,
        lessonsCount: 8,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'state',
    },
    {
      name: 'Free Course',
      description: 'Free course offering with $0 price',
      props: {
        price: 0,
        lessonsCount: 4,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: '1 Hour Lessons - Low Price',
      description: 'Budget-friendly 1-hour course at lower price point',
      props: {
        price: 25,
        lessonsCount: 8,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: '1 Hour Lessons - Mid Price',
      description: 'Standard 1-hour course pricing',
      props: {
        price: 35,
        lessonsCount: 8,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: '1.5 Hour Lessons',
      description: 'Pricing form for 1.5-hour lesson format with suggested pricing',
      props: {
        price: 45,
        lessonsCount: 10,
        lessonLength: 1.5,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: '2 Hour Lessons',
      description: 'Extended 2-hour lessons with higher pricing',
      props: {
        price: 55,
        lessonsCount: 12,
        lessonLength: 2,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: '3 Hour Lessons',
      description: 'Intensive 3-hour workshop format',
      props: {
        price: 75,
        lessonsCount: 6,
        lessonLength: 3,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Single Lesson Course',
      description: 'Course with only one lesson scheduled',
      props: {
        price: 50,
        lessonsCount: 1,
        lessonLength: 2,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Maximum Lessons',
      description: 'Full 12-week course with maximum lessons',
      props: {
        price: 40,
        lessonsCount: 12,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Premium Pricing',
      description: 'High-value course with premium pricing',
      props: {
        price: 150,
        lessonsCount: 8,
        lessonLength: 2,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Validation Error',
      description: 'Form showing price validation error message',
      props: {
        price: 5,
        lessonsCount: 8,
        lessonLength: 1,
        onPriceChange: (value) => console.log('Price:', value),
        onLessonLengthChange: (value) => console.log('Lesson length:', value),
        error: 'Price must be at least $10 per lesson',
      },
      status: 'prod',
      category: 'state',
    },
  ],
}
