import type { ModalProps } from "@thicket/components/ui/modal/Modal"
import type { GalleryEntry } from "@thicket/platform/gallery/registry/types"
import type { GalleryComponentMeta } from '@thicket/platform/gallery/types'

const modalMeta: GalleryComponentMeta = {
    id: 'ui/modal',
  sourceId: '@thicket/components/ui/modal#Modal',
  status: 'prod',
}

export const modalGalleryEntry: GalleryEntry<ModalProps> = {
  name: 'Modal',
  importPath: modalMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: 'ui/modal',
  layoutSize: 'medium',
  variants: [
    {
      name: 'Small Modal',
      description: 'Compact modal size. Use composition API: Modal.Header, Modal.Body, Modal.Footer. See PublishCourseModal for real examples.',
      props: { isOpen: true, onClose: () => {}, size: 'small', children: 'Modal content - use Modal.Header, Modal.Body, Modal.Footer' },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'Medium Modal',
      description: 'Standard modal size. Use composition API: Modal.Header, Modal.Body, Modal.Footer. See EnrollmentSuccessModal for real examples.',
      props: { isOpen: true, onClose: () => {}, size: 'medium', children: 'Modal content - use Modal.Header, Modal.Body, Modal.Footer' },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'Large Modal',
      description: 'Wide modal for complex content. Use composition API: Modal.Header, Modal.Body, Modal.Footer. See StripeCheckoutModal for real examples.',
      props: { isOpen: true, onClose: () => {}, size: 'large', children: 'Modal content - use Modal.Header, Modal.Body, Modal.Footer' },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'XLarge Modal',
      description: 'Extra wide modal for very complex content. Use composition API: Modal.Header, Modal.Body, Modal.Footer.',
      props: { isOpen: true, onClose: () => {}, size: 'xlarge', children: 'Modal content - use Modal.Header, Modal.Body, Modal.Footer' },
      status: 'prod',
      category: 'size',
    },
    {
      name: 'With Close Controls',
      description: 'Modal with custom closeOnOverlayClick and closeOnEscape controls. Use composition API for content.',
      props: { 
        isOpen: true, 
        onClose: () => {}, 
        size: 'medium',
        closeOnOverlayClick: false,
        closeOnEscape: true,
        children: 'Modal content - use Modal.Header, Modal.Body, Modal.Footer' 
      },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'Modal.Header',
      description: 'Modal header with title, optional icon, subtitle, and close button. Used in 8 production modals: PublishCourseModal, ArchiveCourseModal, EnrollmentSuccessModal, StripeCheckoutModal, ResetDraftModal, PublishConfirmationModal, StripeConnectModal, MessageComposerModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Header onClose={handleClose} subtitle="Optional subtitle">
  Modal Title
</Modal.Header>

<Modal.Header icon={BookOpen} onClose={handleClose} subtitle="With icon">
  Course Settings
</Modal.Header>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Body',
      description: 'Main content area for modal with vertical padding. Use space-y-6 for consistent section spacing inside. Modal wrapper provides horizontal padding (px-6).',
      props: {
        __skipRender: true,
        __exampleCode: `// Standard usage with consistent spacing
<Modal.Body>
  <div className="space-y-6">
    <Modal.CourseCard title="..." />
    <Modal.Warning variant="info">...</Modal.Warning>
    <Modal.Section title="Details">...</Modal.Section>
  </div>
</Modal.Body>

// Without vertical padding (for custom layouts)
<Modal.Body padding="none">
  <div className="custom-layout">...</div>
</Modal.Body>

// Padding options: none, small (py-4), medium (py-6, default), large (py-8)`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Footer - Right Aligned',
      description: 'Footer with buttons aligned to the right (default). Has pt-6 pb-6 and border-t. Used in: MessageComposerModal, PublishCourseModal, ArchiveCourseModal, ResetDraftModal, PublishConfirmationModal.',
      props: {
        __skipRender: true,
        __exampleCode: `<Modal.Footer align="right">
  <Button variant="outline">Cancel</Button>
  <Button variant="brand">Confirm</Button>
</Modal.Footer>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Footer - Left Aligned',
      description: 'Footer with buttons aligned to the left. Used in: EnrollmentSuccessModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Footer align="left">
  <Button variant="brand">Go to Dashboard</Button>
  <Button variant="outline">View Course</Button>
</Modal.Footer>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Footer - Center Aligned',
      description: 'Footer with buttons centered. Available for use.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Footer align="center">
  <Button variant="brand">Continue</Button>
</Modal.Footer>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Footer - Between Aligned',
      description: 'Footer with space-between alignment for navigation flows. Available for use.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Footer align="between">
  <Button variant="ghost">Back</Button>
  <div className="flex gap-3">
    <Button variant="outline">Skip</Button>
    <Button variant="brand">Next</Button>
  </div>
</Modal.Footer>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Footer - Without Border',
      description: 'Footer without top border. Use when you want seamless content flow.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Footer align="right" bordered={false}>
  <Button variant="outline">Cancel</Button>
  <Button variant="brand">Confirm</Button>
</Modal.Footer>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Warning',
      description: 'Warning/info banner with variants: info, warning, error, success. Used in 4 production modals: PublishCourseModal, ArchiveCourseModal, PublishConfirmationModal, ResetDraftModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Warning variant="info" title="Information">
  This is an informational message.
</Modal.Warning>

<Modal.Warning variant="warning" title="Warning">
  This action cannot be undone.
</Modal.Warning>

<Modal.Warning variant="error" title="Error">
  Something went wrong.
</Modal.Warning>

<Modal.Warning variant="success" title="Success">
  Your changes have been saved!
</Modal.Warning>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.CourseCard',
      description: 'Course information card with two variants: card (styled) and info (minimal). Used in 3 production modals: PublishCourseModal, ArchiveCourseModal, PublishConfirmationModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `// Card variant (default) - styled with brand colors
<Modal.CourseCard
  title="Introduction to React"
  subtitle="8 weeks • Advanced Level"
  coverUrl="https://example.com/cover.jpg"
/>

// Info variant - minimal display
<Modal.CourseCard
  variant="info"
  title="Introduction to React"
  subtitle="8 lessons"
/>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.BulletList',
      description: 'Bullet point list with optional icons and custom bullet colors. Used in 5 production modals: EnrollmentSuccessModal, ResetDraftModal, PublishConfirmationModal, ArchiveCourseModal, StripeConnectModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.BulletList
  items={[
    "First item",
    "Second item",
    "Third item"
  ]}
/>

<Modal.BulletList
  icon={CheckCircle}
  iconClassName="h-4 w-4 text-green-600"
  items={["Item 1", "Item 2"]}
/>

<Modal.BulletList
  items={["Item 1", "Item 2"]}
  bulletColor="text-blue-600"
/>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.InfoSection',
      description: 'Icon + text section pattern for displaying information. Used in 1 production modal: EnrollmentSuccessModal.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.InfoSection
  icon={Calendar}
  title="First Lesson"
  description="January 15, 2024"
/>

<Modal.InfoSection
  icon={User}
  title="Your Instructor"
  description="Dr. Emily Watson"
  iconBg="bg-blue-50"
  iconColor="text-blue-600"
/>`
      },
      status: 'prod',
      category: 'primitive',
    },
    {
      name: 'Modal.Section',
      description: 'Content section with title and spacing options. Available for use but not yet used in production modals.',
      props: { 
        __skipRender: true,
        __exampleCode: `<Modal.Section title="Course Details" spacing="normal">
  <Modal.CourseCard title="React Basics" />
  <Modal.Warning variant="info" title="Note">
    This course is in draft mode
  </Modal.Warning>
</Modal.Section>

<Modal.Section title="Settings" spacing="tight">
  <p>Content with tight spacing</p>
</Modal.Section>`
      },
      status: 'prod',
      category: 'primitive',
    },
  ],
}
