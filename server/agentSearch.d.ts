/**
 * Typed surface for server/agentSearch.mjs (untyped .mjs per the
 * utils/canvasAgentOperations.mjs precedent — behavior guarded by tests).
 */
export interface AgentSearchConfig {
  TAVILY_API_KEY?: string
  BRAVE_SEARCH_API_KEY?: string
  SERPAPI_API_KEY?: string
  MAPBOX_ACCESS_TOKEN?: string
  GOOGLE_MAPS_API_KEY?: string
  PEXELS_API_KEY?: string
  UNSPLASH_ACCESS_KEY?: string
  GIPHY_API_KEY?: string
  PIXABAY_API_KEY?: string
  YOUTUBE_API_KEY?: string
  PINTEREST_ACCESS_TOKEN?: string
  PINTEREST_COUNTRY_CODE?: string | null
  PINTEREST_LOCALE?: string | null
  PINTEREST_ENABLE_PARTNER_SEARCH?: boolean
}

export interface WebSearchResultSet {
  provider: string
  results: any[]
}

export interface RoutePlanResult {
  provider: string
  mode: string
  mapUrl: string
  embedUrl: string
  route: any
  warning?: string
}

export interface AssetSearchResultSet {
  provider: string
  type: string
  license: string
  results: any[]
  warnings?: string[]
}

export interface AgentSearch {
  searchWeb(
    query: string,
    options?: { provider?: unknown; maxResults?: unknown }
  ): Promise<WebSearchResultSet>
  getRoutePlan(
    origin: string,
    destination: string,
    options?: { mode?: unknown; provider?: unknown }
  ): Promise<RoutePlanResult>
  searchAssets(
    query: string,
    options?: { type?: unknown; license?: unknown; provider?: unknown; maxResults?: unknown }
  ): Promise<AssetSearchResultSet>
  inferMediaKindFromMimeType(mimeType: string, fallbackUrl?: string): string
  filenameFromRemoteUrl(remoteUrl: string, fallbackExt: string): string
}

export function createAgentSearch(config?: AgentSearchConfig): AgentSearch
