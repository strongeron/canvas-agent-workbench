import { Link, router, usePage } from "../shims/inertia-react"
import { track } from "@plausible-analytics/tracker"
import { Menu, X } from "lucide-react"
import { useState } from "react"

import { Button } from "./ui/button"
import { about_us_path, contacts_path, root_path, teach_path } from "../routes"

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const page = usePage()

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const handleJoinEarlyAccess = () => {
    track("menu_join_cta_clicked", {})
    router.replace({
      props: (currentProps) => ({
        ...currentProps,
        show_early_access: true,
      }),
      preserveScroll: true,
      preserveState: true,
    })
  }

  const handleJoinToTeach = () => {
    track("join_to_teach_nav_clicked", { props: { source: "header_navigation" } })
    router.visit(teach_path())
  }

  return (
    <header className="absolute top-0 right-0 left-0 z-50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={root_path()}
              className="cursor-pointer"
              onClick={closeMobileMenu}
            >
              <span className="text-sm font-semibold text-brand-700">Brand</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden items-center gap-8 pr-8 md:flex">
              {page.url.split("?")[0] == root_path() ? (
                <a
                  href="#courses"
                  className="font-display text-brand-700 hover:text-brand-800 cursor-pointer text-sm font-semibold transition-colors"
                >
                  Courses
                </a>
              ) : (
                <Link
                  href={root_path({ anchor: "courses" })}
                  prefetch
                  className="font-display text-brand-700 hover:text-brand-800 cursor-pointer text-sm font-semibold transition-colors"
                >
                  Courses
                </Link>
              )}
              <Link
                href={about_us_path()}
                prefetch
                className="font-display text-brand-700 hover:text-brand-800 cursor-pointer text-sm font-semibold transition-colors"
              >
                About
              </Link>
              <Link
                href={contacts_path()}
                prefetch
                className="font-display text-brand-700 hover:text-brand-800 cursor-pointer text-sm font-semibold transition-colors"
              >
                Contact Us
              </Link>
            </nav>

            <Button
              variant="outline"
              size="sm"
              fullWidth={false}
              onClick={handleJoinToTeach}
              className="hidden md:inline-flex !bg-transparent !border-brand-600 !text-brand-600 hover:!bg-brand-100 hover:!text-brand-700 hover:!border-brand-700 transition-all duration-200"
            >
              Teach with Us
            </Button>

            <button
              onClick={handleJoinEarlyAccess}
              className="bg-brand-600 text-inverse font-display hover:bg-brand-700 active:bg-brand-800 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition-all sm:px-6"
            >
              Join Early Access
            </button>

            <button
              onClick={toggleMobileMenu}
              className="text-brand-700 hover:text-brand-800 cursor-pointer p-2 transition-colors md:hidden"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} `}
        >
          <nav className="mt-2 space-y-2 rounded-lg bg-white/95 py-4 shadow-lg backdrop-blur-sm">
            {page.url.split("?")[0] == root_path() ? (
              <a
                href="#courses"
                className="font-display text-brand-700 hover:text-brand-800 hover:bg-brand-50 block cursor-pointer px-4 py-3 text-sm font-semibold transition-colors"
                onClick={closeMobileMenu}
              >
                Courses
              </a>
            ) : (
              <Link
                href={root_path({ anchor: "courses" })}
                prefetch
                className="font-display text-brand-700 hover:text-brand-800 hover:bg-brand-50 block cursor-pointer px-4 py-3 text-sm font-semibold transition-colors"
                onClick={closeMobileMenu}
              >
                Courses
              </Link>
            )}
            <Link
              href={teach_path()}
              prefetch
              className="font-display text-brand-700 hover:text-brand-800 hover:bg-brand-50 block cursor-pointer px-4 py-3 text-sm font-semibold transition-colors"
              onClick={closeMobileMenu}
            >
              Teach
            </Link>
            <Link
              href={about_us_path()}
              prefetch
              className="font-display text-brand-700 hover:text-brand-800 hover:bg-brand-50 block cursor-pointer px-4 py-3 text-sm font-semibold transition-colors"
              onClick={closeMobileMenu}
            >
              About
            </Link>
            <Link
              href={contacts_path()}
              className="font-display text-brand-700 hover:text-brand-800 hover:bg-brand-50 block cursor-pointer px-4 py-3 text-sm font-semibold transition-colors"
              onClick={closeMobileMenu}
            >
              Contact Us
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
