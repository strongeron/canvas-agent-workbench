import type { SelectProps } from "@/components/ui/select"
import type { GalleryComponentMeta } from '../registry/types'
import type { GalleryEntry } from "../registry/types"
import { propSchemas } from "../registry/schema-helpers"

export const selectMeta: GalleryComponentMeta = {
  id: 'ui/select',
  sourceId: '@/components/ui/select#Select',
  status: 'prod',
}

export const selectGalleryEntry: GalleryEntry<SelectProps> = {
  name: 'Select',
  importPath: selectMeta.sourceId.split('#')[0],
  category: 'Base UI',
  id: selectMeta.id,
  layoutSize: 'full',
  allowOverflow: true,
  meta: selectMeta,
  variants: [
    {
      name: 'Interactive',
      description: 'Customize select properties and see changes live',
      props: { label: 'Country', children: '<option value="">Select a country</option><option value="us">United States</option><option value="uk">United Kingdom</option><option value="ca">Canada</option><option value="fr">France</option><option value="de">Germany</option>' },
      status: 'prod',
      category: 'interactive',
      interactive: true,
      interactiveSchema: propSchemas.selectSchema(),
    },
    {
      name: 'Default',
      description: 'Standard select dropdown with light styling',
      props: { label: 'Country', children: '<option value="">Select a country</option><option value="us">United States</option><option value="uk">United Kingdom</option><option value="ca">Canada</option><option value="fr">France</option><option value="de">Germany</option>' },
      status: 'prod',
      category: 'variant',
    },
    {
      name: 'With Pre-Selected Value',
      description: 'Select with a default selected value',
      props: { label: 'Language', defaultValue: 'en', children: '<option value="en">English</option><option value="es">Spanish</option><option value="fr">French</option><option value="de">German</option><option value="zh">Chinese</option>' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Error State',
      description: 'Select with error message and red border',
      props: { label: 'Category', error: 'Please select a category', children: '<option value="">Select category</option><option value="tech">Technology</option><option value="art">Art</option><option value="science">Science</option>' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Success State',
      description: 'Select with success message and green border',
      props: { label: 'Time Zone', success: 'Time zone updated successfully', defaultValue: 'est', children: '<option value="est">Eastern (EST)</option><option value="cst">Central (CST)</option><option value="mst">Mountain (MST)</option><option value="pst">Pacific (PST)</option>' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Warning State',
      description: 'Select with warning message and amber border',
      props: { label: 'Notification Frequency', warning: 'This setting affects your inbox volume', children: '<option value="">Select frequency</option><option value="realtime">Real-time</option><option value="daily">Daily digest</option><option value="weekly">Weekly summary</option>' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Disabled',
      description: 'Disabled select dropdown with reduced opacity',
      props: { label: 'Role', disabled: true, defaultValue: 'student', children: '<option value="student">Student</option><option value="teacher">Teacher</option>' },
      status: 'archive',
      category: 'state',
    },
    {
      name: 'Hidden Label',
      description: 'Select with visually hidden label for screen readers only',
      props: { label: 'Filter by category', hideLabel: true, children: '<option value="">All Categories</option><option value="art">Art History</option><option value="science">Science</option><option value="tech">Technology</option>' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'With Grouped Options',
      description: 'Select using optgroup for organized options',
      props: { label: 'Academic Field', children: '<optgroup label="Sciences"><option value="physics">Physics</option><option value="chemistry">Chemistry</option><option value="biology">Biology</option></optgroup><optgroup label="Humanities"><option value="history">History</option><option value="literature">Literature</option><option value="philosophy">Philosophy</option></optgroup><optgroup label="Arts"><option value="music">Music</option><option value="painting">Painting</option><option value="sculpture">Sculpture</option></optgroup>' },
      status: 'archive',
      category: 'variant',
    },
    {
      name: 'Long List of Options',
      description: 'Select with many options demonstrating scrolling',
      props: { label: 'Institution', children: '<option value="">Select your institution</option><option value="harvard">Harvard University</option><option value="mit">MIT</option><option value="stanford">Stanford University</option><option value="yale">Yale University</option><option value="princeton">Princeton University</option><option value="columbia">Columbia University</option><option value="uchicago">University of Chicago</option><option value="penn">University of Pennsylvania</option><option value="caltech">Caltech</option><option value="duke">Duke University</option><option value="northwestern">Northwestern University</option><option value="dartmouth">Dartmouth College</option>' },
      status: 'archive',
      category: 'variant',
    },
  ],
}
