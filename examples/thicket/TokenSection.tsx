import { Check, Copy } from "lucide-react"
import { useState } from "react"

import type { DesignToken } from "./mocks/designTokens"

interface TokenSectionProps {
  category: string
  tokens: DesignToken[]
  searchQuery: string
}

export function TokenSection({
  category,
  tokens,
  searchQuery,
}: TokenSectionProps) {
  const filteredTokens = searchQuery
    ? tokens.filter(
        (token) =>
          token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
          token.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tokens

  if (filteredTokens.length === 0) {
    return null
  }

  const tokensBySubcategory = filteredTokens.reduce((acc, token) => {
    const sub = token.subcategory || 'other'
    if (!acc[sub]) acc[sub] = []
    acc[sub].push(token)
    return acc
  }, {} as Record<string, DesignToken[]>)

  return (
    <section>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-1 w-12 rounded-full bg-brand-500" />
        <h2 className="font-display text-foreground text-2xl font-bold capitalize">
          {category}
        </h2>
        <span className="text-muted rounded-full bg-surface-200 px-3 py-1 text-sm font-medium">
          {filteredTokens.length} tokens
        </span>
      </div>

      <div className="space-y-8">
        {Object.entries(tokensBySubcategory).map(([subcategory, subTokens]) => (
          <div key={subcategory}>
            <h3 className="text-muted-foreground mb-4 text-sm font-semibold uppercase tracking-wider">
              {subcategory}
            </h3>

            {category === 'color' && (
              <ColorTokenGrid tokens={subTokens} />
            )}

            {category === 'typography' && (
              <TypographyTokenList tokens={subTokens} subcategory={subcategory} />
            )}

            {(category === 'spacing' || category === 'radius' || category === 'shadow' || category === 'duration') && (
              <GenericTokenList tokens={subTokens} category={category} />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ColorTokenGrid({ tokens }: { tokens: DesignToken[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tokens.map((token) => (
        <ColorTokenCard key={token.name} token={token} />
      ))}
    </div>
  )
}

function ColorTokenCard({ token }: { token: DesignToken }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(token.cssVar || token.value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-default bg-white shadow-sm transition-all hover:shadow-md">
      <div
        className="h-24 w-full"
        style={{ backgroundColor: token.value }}
      />
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between">
          <h4 className="text-foreground text-sm font-semibold">{token.name}</h4>
          <button
            onClick={handleCopy}
            className="text-muted hover:text-foreground transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
        <code className="text-muted mb-1 block text-xs font-mono">
          {token.value}
        </code>
        {token.cssVar && (
          <code className="text-brand-600 block text-xs font-mono">
            {token.cssVar}
          </code>
        )}
        {token.description && (
          <p className="text-muted-foreground mt-2 text-xs">{token.description}</p>
        )}
      </div>
    </div>
  )
}

function TypographyTokenList({
  tokens,
  subcategory,
}: {
  tokens: DesignToken[]
  subcategory: string
}) {
  if (subcategory === 'font-family') {
    return (
      <div className="space-y-4">
        {tokens.map((token) => (
          <div
            key={token.name}
            className="rounded-xl border border-default bg-white p-6 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-foreground font-semibold">{token.name}</h4>
              <code className="text-brand-600 text-xs font-mono">
                {token.cssVar}
              </code>
            </div>
            <p
              className="text-foreground text-2xl"
              style={{ fontFamily: token.value }}
            >
              The quick brown fox jumps over the lazy dog
            </p>
            <code className="text-muted mt-2 block text-xs font-mono">
              {token.value}
            </code>
          </div>
        ))}
      </div>
    )
  }

  if (subcategory === 'font-size') {
    return (
      <div className="space-y-3">
        {tokens.map((token) => {
          const sizeValue = token.value
          return (
            <div
              key={token.name}
              className="flex items-center gap-4 rounded-xl border border-default bg-white p-4 shadow-sm"
            >
              <div className="w-32">
                <h4 className="text-foreground text-sm font-semibold">
                  {token.name}
                </h4>
                <code className="text-muted text-xs font-mono">
                  {token.value}
                </code>
              </div>
              <div className="flex-1">
                <p
                  className="text-foreground font-display font-semibold"
                  style={{ fontSize: sizeValue }}
                >
                  Sample Text
                </p>
              </div>
              {token.description && (
                <span className="text-muted text-xs">{token.description}</span>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return <GenericTokenList tokens={tokens} category="typography" />
}

function GenericTokenList({
  tokens,
  category,
}: {
  tokens: DesignToken[]
  category: string
}) {
  return (
    <div className="space-y-3">
      {tokens.map((token) => {
        const [copied, setCopied] = useState(false)

        const handleCopy = () => {
          navigator.clipboard.writeText(token.cssVar || token.value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }

        return (
          <div
            key={token.name}
            className="flex items-center justify-between rounded-xl border border-default bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div>
                <h4 className="text-foreground mb-1 text-sm font-semibold">
                  {token.name}
                </h4>
                <code className="text-muted text-xs font-mono">
                  {token.value}
                </code>
                {token.cssVar && (
                  <code className="text-brand-600 ml-3 text-xs font-mono">
                    {token.cssVar}
                  </code>
                )}
              </div>

              {category === 'shadow' && (
                <div
                  className="h-12 w-12 rounded-lg bg-white"
                  style={{ boxShadow: token.value }}
                />
              )}

              {category === 'radius' && (
                <div
                  className="h-12 w-12 bg-brand-100"
                  style={{ borderRadius: token.value }}
                />
              )}
            </div>

            <button
              onClick={handleCopy}
              className="text-muted hover:text-foreground transition-colors"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
