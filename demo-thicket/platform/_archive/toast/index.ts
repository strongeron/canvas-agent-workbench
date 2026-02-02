/**
 * @deprecated Legacy toast system - archived in favor of sonner
 *
 * This folder contains the old custom toast implementation that has been
 * replaced by the sonner library for better features:
 * - Stacking support
 * - Rich positioning options
 * - Promise-based toasts
 * - Action buttons
 * - Custom styling
 *
 * For new toast usage, import from:
 * - import { toast } from "sonner" (direct sonner API)
 * - import { useToast } from "../../../hooks/useToast" (wrapper hook)
 */

export { ToastContainer, type Toast, type ToastVariant } from './toast'
export { ToastProvider, useToast } from './ToastContext'
export { ToastPreview } from './ToastPreview'
