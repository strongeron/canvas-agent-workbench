import { Link } from "@thicket/shims/inertia-react"
import { Instagram, Twitter } from "lucide-react"

import {
  about_us_path,
  contacts_path,
  privacy_path,
  root_path,
  terms_path,
} from "@thicket/routes"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="from-surface-50 via-brand-50 to-brand-100 border-default relative overflow-hidden border-t bg-linear-to-br">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(to bottom, rgba(95, 186, 137, 0) 0%, #5FBA89 200%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, rgba(0, 118, 106, 0.10), transparent 90%)`,
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:gap-4">
          {/* Row 1: Logo and Navigation */}
          <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
            <Link
              href={root_path()}
              className="cursor-pointer transition-opacity hover:opacity-80"
            >
          <span className="text-sm font-semibold text-brand-700">Brand</span>
            </Link>

            <div className="flex items-center gap-5 text-base">
              <Link
                href={about_us_path()}
                className="text-brand-700 hover:text-brand-800 font-medium transition-colors"
              >
                About
              </Link>
              <Link
                href={contacts_path()}
                className="text-brand-700 hover:text-brand-800 font-medium transition-colors"
              >
                Contact Us
              </Link>
              <a
                href="https://x.com/thicket"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Thicket on X (formerly Twitter)"
                className="text-brand-700 hover:text-brand-800 transition-all hover:scale-110"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/jointhicket"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Thicket on Instagram"
                className="text-brand-700 hover:text-brand-800 transition-all hover:scale-110"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Row 2: Copyright and Legal */}
          <div className="flex flex-col items-center justify-between gap-2 md:flex-row">
            <p className="text-muted-foreground text-xs">
              Copyright {currentYear} Thicket. All rights reserved.
            </p>

            <div className="flex items-center gap-3 text-sm">
              <Link
                href={terms_path()}
                className="text-brand-700 hover:text-brand-800 font-medium transition-colors"
              >
                Terms
              </Link>
              <Link
                href={privacy_path()}
                className="text-brand-700 hover:text-brand-800 font-medium transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
