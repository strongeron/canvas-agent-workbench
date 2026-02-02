import { Modal as ModalBase } from "./Modal"
import { ModalBody } from "./ModalBody"
import { ModalBulletList } from "./ModalBulletList"
import { ModalCourseCard } from "./ModalCourseCard"
import { ModalFooter } from "./ModalFooter"
import { ModalHeader } from "./ModalHeader"
import { ModalInfoSection } from "./ModalInfoSection"
import { ModalSection } from "./ModalSection"
import { ModalWarning } from "./ModalWarning"

export const Modal = Object.assign(ModalBase, {
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Warning: ModalWarning,
  Section: ModalSection,
  CourseCard: ModalCourseCard,
  BulletList: ModalBulletList,
  InfoSection: ModalInfoSection,
})

export { ModalBody, ModalBulletList, ModalCourseCard, ModalFooter, ModalHeader, ModalInfoSection, ModalSection, ModalWarning }

export type { ModalProps } from "./Modal"
export type { ModalHeaderProps } from "./ModalHeader"
