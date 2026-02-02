import type { LucideIcon } from "lucide-react"
import { CreditCard, ExternalLink, Settings } from "lucide-react"

import { Button } from "@thicket/components/ui/button"

export type BillingCTAAction = "upgrade" | "subscribe" | "manage" | "connect-stripe"
export type BillingCTAStatus = "active" | "inactive" | "trial"

interface BillingCTAConfig {
  show: boolean
  text: string
  icon?: LucideIcon
  variant: "brand" | "secondary" | "ghost" | "outline"
  href?: string
  onClick?: () => void
  disabled?: boolean
}

interface GetBillingCTAConfigParams {
  plan?: { id: number; name: string; price: number }
  status?: BillingCTAStatus
  action: BillingCTAAction
  onUpgrade?: () => void
  onSubscribe?: () => void
  onManage?: () => void
  onConnectStripe?: () => void
}

export function getBillingCTAConfig({
  plan,
  status: _status,
  action,
  onUpgrade,
  onSubscribe,
  onManage,
  onConnectStripe,
}: GetBillingCTAConfigParams): BillingCTAConfig {
  if (action === "upgrade" && onUpgrade) {
    return {
      show: true,
      text: plan ? `Upgrade to ${plan.name} - $${plan.price}` : "Upgrade Plan",
      icon: CreditCard,
      variant: "brand",
      onClick: onUpgrade,
    }
  }

  if (action === "subscribe" && onSubscribe) {
    return {
      show: true,
      text: plan ? `Subscribe - $${plan.price}` : "Subscribe",
      icon: CreditCard,
      variant: "brand",
      onClick: onSubscribe,
    }
  }

  if (action === "manage" && onManage) {
    return {
      show: true,
      text: "Manage Subscription",
      icon: Settings,
      variant: "secondary",
      onClick: onManage,
    }
  }

  if (action === "connect-stripe" && onConnectStripe) {
    return {
      show: true,
      text: "Connect Stripe",
      icon: ExternalLink,
      variant: "brand",
      onClick: onConnectStripe,
    }
  }

  // Default: no button
  return {
    show: false,
    text: "",
    variant: "ghost",
  }
}

export interface BillingCTAProps {
  plan?: { id: number; name: string; price: number }
  status?: BillingCTAStatus
  action: BillingCTAAction
  onUpgrade?: () => void
  onSubscribe?: () => void
  onManage?: () => void
  onConnectStripe?: () => void
  size?: "sm" | "md" | "lg"
  fullWidth?: boolean
  className?: string
}

export function BillingCTA({
  plan,
  status,
  action,
  onUpgrade,
  onSubscribe,
  onManage,
  onConnectStripe,
  size = "md",
  fullWidth,
  className = "",
}: BillingCTAProps) {
  const config = getBillingCTAConfig({
    plan,
    status,
    action,
    onUpgrade,
    onSubscribe,
    onManage,
    onConnectStripe,
  })

  if (!config.show) {
    return null
  }

  const buttonProps = {
    variant: config.variant,
    size,
    fullWidth,
    className,
    icon: config.icon,
    disabled: config.disabled,
    rounded: "lg" as const,
  }

  if (config.href) {
    const href = typeof config.href === "string" ? config.href : String(config.href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={fullWidth ? "w-full" : ""}>
        <Button {...buttonProps}>{config.text}</Button>
      </a>
    )
  }

  if (config.onClick) {
    return (
      <Button {...buttonProps} onClick={config.onClick}>
        {config.text}
      </Button>
    )
  }

  return (
    <Button {...buttonProps}>
      {config.text}
    </Button>
  )
}

