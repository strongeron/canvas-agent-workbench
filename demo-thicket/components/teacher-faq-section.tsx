import { Link } from "../shims/inertia-react"

import { Accordion, type AccordionItem } from "./ui/accordion"
import { contacts_path } from "../routes"

export function TeacherFAQSection() {
  const faqItems: AccordionItem[] = [
    {
      id: "qualifications",
      question: "What qualifications do I need to teach?",
      answer:
        "We&apos;re looking for passionate educators with deep knowledge of their subject area. Most of our teachers have graduate degrees and teaching or research experience, but we also welcome independent scholars and subject matter experts. What matters most is your enthusiasm for the topic and ability to facilitate engaging discussions.",
    },
    {
      id: "students",
      question: "Who will I be teaching?",
      answer:
        "You&apos;ll teach motivated adult learners (18+) who are learning purely for the joy of it. Our students come from diverse backgrounds and range from young professionals to retirees. They&apos;re curious, engaged, and excited to dive deep into subjects they&apos;re passionate about.",
    },
    {
      id: "earnings",
      question: "How much can I earn?",
      answer:
        "You set your own course fees based on the course length and content. Most seminars range from $25-35, per hour, per week. With a class of 15 students at $180 per person, that&apos;s $2,700 for a 6-week course (6 hours of teaching time). Thicket takes a modest platform fee to cover payment processing, marketing, and support. Contact us for details.",
    },
    {
      id: "time",
      question: "How much time commitment is required?",
      answer:
        "Most seminars run 1-8 weeks with one 60-90 minute session per week. Beyond class time, expect to spend a few hours per week on preparation.",
    },
    {
      id: "topics",
      question: "What topics can I teach?",
      answer:
        "Thicket focuses on humanities subjects including history, literature, philosophy, art history, religious studies, classics, and related fields. We&apos;re especially interested in unique angles and interdisciplinary approaches. If you have a course idea you&apos;re passionate about, we&apos;d love to hear it.",
    },
  ]

  return (
    <section className="bg-white py-16 md:py-20 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-foreground mb-8 text-center text-3xl font-bold md:text-4xl">
          Frequently asked questions
        </h2>

        <Accordion items={faqItems} />

        <p className="text-muted-foreground mt-8 text-center text-sm">
          Have more questions about teaching with us?{" "}
          <Link
            href={contacts_path()}
            className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
          >
            We&apos;d love to hear from you
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
