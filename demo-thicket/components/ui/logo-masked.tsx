import type { CSSProperties } from "react"

import { cn } from "../../lib/utils"

interface LogoMaskedProps {
  variant?: "full" | "icon"
  className?: string
  style?: CSSProperties
}

export function LogoMasked({
  variant = "full",
  className,
  style,
}: LogoMaskedProps) {
  if (variant === "icon") {
    return (
      <svg
        viewBox="0 0 191 191"
        className={cn("h-6 w-6", className)}
        style={style}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M29.35 105.5H0.609985V120.25H40.05L29.35 105.5Z"
            fill="#D3D1C5"
          />
          <path
            d="M0.609985 140.63V155.37H75.18L64.48 140.63H0.609985Z"
            fill="#D3D1C5"
          />
          <path
            d="M0.609985 190.5H180.57L169.87 175.76H0.609985V190.5Z"
            fill="#D3D1C5"
          />
          <path
            d="M190.76 190.5V179.84L155.87 145V74.7L81.29 0.119995H0.609985V80.8L75.18 155.37H145.44L180.57 190.5H190.76ZM85.61 25.3L106 45.67V95.07L85.61 74.7V25.3ZM15.35 14.87H70.87V60L48.66 37.74H38.23V48.17L60.45 70.38H15.35V14.87ZM46.16 105.5L25.78 85.12H75.19L95.57 105.5H46.16ZM81.29 140.63L60.91 120.25H110.32L130.7 140.63H81.29ZM141.12 130.2L120.74 109.82V60.42L141.12 80.8V130.2Z"
            fill="#90C161"
          />
        </g>
      </svg>
    )
  }

  return (
    <div
      className={cn("inline-flex items-center font-display text-base font-semibold text-foreground", className)}
      style={style}
    >
      Thicket
    </div>
  )
}
