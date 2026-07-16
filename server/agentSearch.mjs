import path from "node:path"

// FOX2-75 slice 7: the agent search/route/asset provider subsystem, moved
// verbatim from vite.config.ts. Untyped .mjs following the
// utils/canvasAgentOperations.mjs precedent — behavior is guarded by direct
// tests, and server/agentSearch.d.ts declares the typed surface. The factory
// takes the provider keys as config (same names the vite.config consts had)
// because env files are loaded after module imports resolve.

export function createAgentSearch(config = {}) {
  const {
    TAVILY_API_KEY,
    BRAVE_SEARCH_API_KEY,
    SERPAPI_API_KEY,
    MAPBOX_ACCESS_TOKEN,
    GOOGLE_MAPS_API_KEY,
    PEXELS_API_KEY,
    UNSPLASH_ACCESS_KEY,
    GIPHY_API_KEY,
    PIXABAY_API_KEY,
    YOUTUBE_API_KEY,
    PINTEREST_ACCESS_TOKEN,
    PINTEREST_COUNTRY_CODE,
    PINTEREST_LOCALE,
    PINTEREST_ENABLE_PARTNER_SEARCH,
  } = config
  function clampInteger(value, min, max, fallback) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return Math.min(max, Math.max(min, Math.floor(parsed)))
  }

  async function fetchJsonWithTimeout(url, options = {}) {
    const { timeoutMs = 15000, ...init } = options
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      })
      const text = await response.text()
      let payload = null
      if (text) {
        try {
          payload = JSON.parse(text)
        } catch {
          payload = { message: text }
        }
      }
      if (!response.ok) {
        const message =
          payload?.error?.message ||
          payload?.error ||
          payload?.message ||
          `Upstream request failed (${response.status}).`
        throw new Error(message)
      }
      return payload || {}
    } finally {
      clearTimeout(timeout)
    }
  }

  function normalizeWebSearchProvider(raw) {
    const value = String(raw || 'auto').trim().toLowerCase()
    if (value === 'tavily' || value === 'brave' || value === 'serpapi') return value
    return 'auto'
  }

  function resolveWebSearchProvider(preferred) {
    const normalized = normalizeWebSearchProvider(preferred)
    if (normalized !== 'auto') return normalized
    if (TAVILY_API_KEY) return 'tavily'
    if (BRAVE_SEARCH_API_KEY) return 'brave'
    if (SERPAPI_API_KEY) return 'serpapi'
    return null
  }

  function normalizeWebSearchResult(result, provider) {
    const title = String(result?.title || result?.name || '').trim()
    const url = String(result?.url || result?.link || '').trim()
    if (!title || !url) return null
    const snippet = String(result?.snippet || result?.description || result?.content || '').trim()
    const thumbnailUrl = String(
      result?.thumbnailUrl ||
      result?.thumbnail ||
      result?.image ||
      result?.imageUrl ||
      ''
    ).trim()
    let host = null
    try {
      host = new URL(url).hostname
    } catch {
      host = null
    }
    return {
      title,
      url,
      snippet,
      host,
      thumbnailUrl: thumbnailUrl || undefined,
      provider,
    }
  }

  async function searchWebViaTavily(query, maxResults) {
    if (!TAVILY_API_KEY) {
      throw new Error('TAVILY_API_KEY is not configured.')
    }
    const payload = await fetchJsonWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_images: true,
      }),
    })
    const results = Array.isArray(payload?.results)
      ? payload.results
          .map((item) =>
            normalizeWebSearchResult(
              {
                title: item?.title,
                url: item?.url,
                content: item?.content,
                imageUrl: item?.image_url,
              },
              'tavily',
            ),
          )
          .filter(Boolean)
      : []
    return {
      provider: 'tavily',
      results: results.slice(0, maxResults),
    }
  }

  async function searchWebViaBrave(query, maxResults) {
    if (!BRAVE_SEARCH_API_KEY) {
      throw new Error('BRAVE_SEARCH_API_KEY is not configured.')
    }
    const params = new URLSearchParams({
      q: query,
      count: String(maxResults),
    })
    const payload = await fetchJsonWithTimeout(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': BRAVE_SEARCH_API_KEY,
      },
    })
    const rows = Array.isArray(payload?.web?.results) ? payload.web.results : []
    const results = rows
      .map((item) =>
        normalizeWebSearchResult(
          {
            title: item?.title,
            url: item?.url,
            description: item?.description,
            thumbnail: item?.thumbnail?.src,
          },
          'brave',
        ),
      )
      .filter(Boolean)
    return {
      provider: 'brave',
      results: results.slice(0, maxResults),
    }
  }

  async function searchWebViaSerpApi(query, maxResults) {
    if (!SERPAPI_API_KEY) {
      throw new Error('SERPAPI_API_KEY is not configured.')
    }
    const params = new URLSearchParams({
      engine: 'google',
      q: query,
      num: String(maxResults),
      api_key: SERPAPI_API_KEY,
    })
    const payload = await fetchJsonWithTimeout(`https://serpapi.com/search.json?${params.toString()}`)
    const rows = Array.isArray(payload?.organic_results) ? payload.organic_results : []
    const results = rows
      .map((item) =>
        normalizeWebSearchResult(
          {
            title: item?.title,
            link: item?.link,
            snippet: item?.snippet,
            thumbnail: item?.thumbnail,
          },
          'serpapi',
        ),
      )
      .filter(Boolean)
    return {
      provider: 'serpapi',
      results: results.slice(0, maxResults),
    }
  }

  async function searchWeb(query, options = {}) {
    const maxResults = clampInteger(options?.maxResults, 1, 20, 8)
    const provider = resolveWebSearchProvider(options?.provider)
    if (!provider) {
      throw new Error(
        'No web search provider is configured. Add TAVILY_API_KEY, BRAVE_SEARCH_API_KEY, or SERPAPI_API_KEY.',
      )
    }

    if (provider === 'tavily') return searchWebViaTavily(query, maxResults)
    if (provider === 'brave') return searchWebViaBrave(query, maxResults)
    return searchWebViaSerpApi(query, maxResults)
  }

  function normalizeRouteProvider(raw) {
    const value = String(raw || 'auto').trim().toLowerCase()
    if (value === 'mapbox' || value === 'google') return value
    return 'auto'
  }

  function normalizeRouteMode(raw) {
    const value = String(raw || 'driving').trim().toLowerCase()
    if (value === 'walking' || value === 'cycling' || value === 'transit') return value
    return 'driving'
  }

  function buildGoogleDirectionsUrls(origin, destination, mode) {
    const travelMode = mode === 'cycling' ? 'bicycling' : mode
    const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=${encodeURIComponent(travelMode)}`
    const embedUrl = `https://www.google.com/maps?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&output=embed`
    return { mapUrl, embedUrl }
  }

  function parseGoogleDurationSeconds(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.max(0, Math.round(value))
    }
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const normalized = trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed
    const numeric = Number.parseFloat(normalized)
    if (!Number.isFinite(numeric)) return null
    return Math.max(0, Math.round(numeric))
  }

  async function geocodeMapboxPlace(query) {
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
    url.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN)
    url.searchParams.set('limit', '1')
    const payload = await fetchJsonWithTimeout(url.toString())
    const feature = Array.isArray(payload?.features) ? payload.features[0] : null
    if (!feature || !Array.isArray(feature.center) || feature.center.length < 2) {
      throw new Error(`Mapbox geocoding failed for "${query}".`)
    }
    return {
      name: feature.place_name || query,
      lng: Number(feature.center[0]),
      lat: Number(feature.center[1]),
    }
  }

  async function getRouteViaMapbox(origin, destination, mode) {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN is not configured.')
    }
    const profileMap = {
      driving: 'driving',
      walking: 'walking',
      cycling: 'cycling',
      transit: 'driving',
    }
    const profile = profileMap[mode] || 'driving'
    const [start, end] = await Promise.all([
      geocodeMapboxPlace(origin),
      geocodeMapboxPlace(destination),
    ])
    const directionsUrl = new URL(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${start.lng},${start.lat};${end.lng},${end.lat}`,
    )
    directionsUrl.searchParams.set('access_token', MAPBOX_ACCESS_TOKEN)
    directionsUrl.searchParams.set('overview', 'full')
    directionsUrl.searchParams.set('geometries', 'geojson')
    directionsUrl.searchParams.set('steps', 'false')

    const payload = await fetchJsonWithTimeout(directionsUrl.toString())
    const route = Array.isArray(payload?.routes) ? payload.routes[0] : null
    if (!route) {
      throw new Error('Mapbox directions returned no routes.')
    }
    const urls = buildGoogleDirectionsUrls(origin, destination, mode)
    return {
      provider: 'mapbox',
      mode,
      mapUrl: urls.mapUrl,
      embedUrl: urls.embedUrl,
      route: {
        distanceMeters: Number(route.distance) || null,
        durationSeconds: Number(route.duration) || null,
        summary: String(route.legs?.[0]?.summary || `${origin} to ${destination}`).trim(),
        originLabel: start.name,
        destinationLabel: end.name,
      },
    }
  }

  async function getRouteViaGoogle(origin, destination, mode) {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured.')
    }
    const modeMap = {
      driving: 'DRIVE',
      walking: 'WALK',
      cycling: 'BICYCLE',
      transit: 'TRANSIT',
    }
    const googleMode = modeMap[mode] || 'DRIVE'
    const requestBody = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: googleMode,
      computeAlternativeRoutes: false,
      languageCode: 'en-US',
      units: 'METRIC',
      ...(googleMode === 'DRIVE' ? { routingPreference: 'TRAFFIC_AWARE' } : {}),
    }

    const payload = await fetchJsonWithTimeout('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': [
          'routes.distanceMeters',
          'routes.duration',
          'routes.description',
          'routes.legs.distanceMeters',
          'routes.legs.duration',
          'fallbackInfo.routingMode',
        ].join(','),
      },
      body: JSON.stringify(requestBody),
    })
    const route = Array.isArray(payload?.routes) ? payload.routes[0] : null
    const leg = Array.isArray(route?.legs) ? route.legs[0] : null
    if (!route) {
      throw new Error('Google Routes API returned no routes.')
    }
    const distanceCandidate = Number(route?.distanceMeters ?? leg?.distanceMeters)
    const distanceMeters = Number.isFinite(distanceCandidate) ? distanceCandidate : null
    const durationSeconds =
      parseGoogleDurationSeconds(route?.duration) ??
      parseGoogleDurationSeconds(leg?.duration) ??
      null
    const urls = buildGoogleDirectionsUrls(origin, destination, mode)
    const fallbackMode = String(payload?.fallbackInfo?.routingMode || '').trim()
    return {
      provider: 'google',
      mode,
      mapUrl: urls.mapUrl,
      embedUrl: urls.embedUrl,
      route: {
        distanceMeters,
        durationSeconds,
        summary: String(route?.description || `${origin} to ${destination}`).trim(),
        originLabel: origin,
        destinationLabel: destination,
      },
      warning: fallbackMode ? `Google routing fallback mode used: ${fallbackMode}.` : undefined,
    }
  }

  async function getRoutePlan(origin, destination, options = {}) {
    const mode = normalizeRouteMode(options?.mode)
    const provider = normalizeRouteProvider(options?.provider)

    if (provider === 'mapbox') return getRouteViaMapbox(origin, destination, mode)
    if (provider === 'google') return getRouteViaGoogle(origin, destination, mode)

    if (GOOGLE_MAPS_API_KEY) return getRouteViaGoogle(origin, destination, mode)
    if (MAPBOX_ACCESS_TOKEN) return getRouteViaMapbox(origin, destination, mode)

    const urls = buildGoogleDirectionsUrls(origin, destination, mode)
    return {
      provider: 'url-only',
      mode,
      mapUrl: urls.mapUrl,
      embedUrl: urls.embedUrl,
      route: {
        distanceMeters: null,
        durationSeconds: null,
        summary: `${origin} to ${destination}`,
        originLabel: origin,
        destinationLabel: destination,
      },
      warning:
        'No route API key configured. Returning map URLs only. Add MAPBOX_ACCESS_TOKEN or GOOGLE_MAPS_API_KEY.',
    }
  }

  function normalizeAssetProvider(raw) {
    const value = String(raw || 'auto').trim().toLowerCase()
    if (
      value === 'pexels' ||
      value === 'unsplash' ||
      value === 'giphy' ||
      value === 'pixabay' ||
      value === 'youtube' ||
      value === 'pinterest' ||
      value === 'web'
    ) {
      return value
    }
    return 'auto'
  }

  function normalizeAssetType(raw) {
    const value = String(raw || 'mixed').trim().toLowerCase()
    if (value === 'image' || value === 'video' || value === 'gif') return value
    return 'mixed'
  }

  function normalizeAssetResult(item) {
    const url = String(item?.url || '').trim()
    if (!url) return null
    return {
      id: String(item?.id || `${item?.provider || 'asset'}-${Math.random().toString(36).slice(2, 10)}`),
      title: String(item?.title || item?.name || 'Untitled').trim(),
      assetType: String(item?.assetType || 'image'),
      provider: String(item?.provider || 'unknown'),
      url,
      sourcePageUrl: String(item?.sourcePageUrl || url),
      thumbnailUrl: item?.thumbnailUrl ? String(item.thumbnailUrl) : undefined,
      importUrl: item?.importUrl ? String(item.importUrl) : undefined,
      width: Number.isFinite(Number(item?.width)) ? Number(item.width) : undefined,
      height: Number.isFinite(Number(item?.height)) ? Number(item.height) : undefined,
      durationSeconds: Number.isFinite(Number(item?.durationSeconds)) ? Number(item.durationSeconds) : undefined,
      license: item?.license ? String(item.license) : undefined,
      author: item?.author ? String(item.author) : undefined,
    }
  }

  async function searchAssetsViaPexels(query, type, maxResults) {
    if (!PEXELS_API_KEY) return []
    const endpoint = type === 'video' ? 'https://api.pexels.com/videos/search' : 'https://api.pexels.com/v1/search'
    const params = new URLSearchParams({
      query,
      per_page: String(maxResults),
    })
    const payload = await fetchJsonWithTimeout(`${endpoint}?${params.toString()}`, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    })
    if (type === 'video') {
      const rows = Array.isArray(payload?.videos) ? payload.videos : []
      return rows
        .map((item) => {
          const files = Array.isArray(item?.video_files) ? item.video_files : []
          const preferred = files.find((file) => String(file?.file_type || '').includes('mp4')) || files[0]
          return normalizeAssetResult({
            id: item?.id,
            title: item?.url ? `Pexels video ${item.id}` : `Pexels video`,
            provider: 'pexels',
            assetType: 'video',
            url: item?.url,
            sourcePageUrl: item?.url,
            thumbnailUrl: item?.image,
            importUrl: preferred?.link,
            width: item?.width,
            height: item?.height,
            durationSeconds: item?.duration,
            license: 'Pexels License',
            author: item?.user?.name,
          })
        })
        .filter(Boolean)
    }

    const rows = Array.isArray(payload?.photos) ? payload.photos : []
    return rows
      .map((item) =>
        normalizeAssetResult({
          id: item?.id,
          title: item?.alt || `Pexels photo ${item?.id}`,
          provider: 'pexels',
          assetType: 'image',
          url: item?.url,
          sourcePageUrl: item?.url,
          thumbnailUrl: item?.src?.medium || item?.src?.small,
          importUrl: item?.src?.original || item?.src?.large2x || item?.src?.large,
          width: item?.width,
          height: item?.height,
          license: 'Pexels License',
          author: item?.photographer,
        }),
      )
      .filter(Boolean)
  }

  async function searchAssetsViaUnsplash(query, maxResults) {
    if (!UNSPLASH_ACCESS_KEY) return []
    const params = new URLSearchParams({
      query,
      per_page: String(maxResults),
    })
    const payload = await fetchJsonWithTimeout(`https://api.unsplash.com/search/photos?${params.toString()}`, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    })
    const rows = Array.isArray(payload?.results) ? payload.results : []
    return rows
      .map((item) =>
        normalizeAssetResult({
          id: item?.id,
          title: item?.description || item?.alt_description || `Unsplash photo`,
          provider: 'unsplash',
          assetType: 'image',
          url: item?.links?.html,
          sourcePageUrl: item?.links?.html,
          thumbnailUrl: item?.urls?.small,
          importUrl: item?.urls?.raw || item?.urls?.full,
          width: item?.width,
          height: item?.height,
          license: 'Unsplash License',
          author: item?.user?.name,
        }),
      )
      .filter(Boolean)
  }

  async function searchAssetsViaGiphy(query, maxResults) {
    if (!GIPHY_API_KEY) return []
    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      q: query,
      limit: String(maxResults),
      rating: 'pg',
    })
    const payload = await fetchJsonWithTimeout(`https://api.giphy.com/v1/gifs/search?${params.toString()}`)
    const rows = Array.isArray(payload?.data) ? payload.data : []
    return rows
      .map((item) =>
        normalizeAssetResult({
          id: item?.id,
          title: item?.title || 'Giphy GIF',
          provider: 'giphy',
          assetType: 'gif',
          url: item?.url,
          sourcePageUrl: item?.url,
          thumbnailUrl: item?.images?.fixed_width?.url || item?.images?.preview_gif?.url,
          importUrl: item?.images?.original?.url,
          width: item?.images?.original?.width,
          height: item?.images?.original?.height,
          license: 'GIPHY Terms',
          author: item?.username,
        }),
      )
      .filter(Boolean)
  }

  async function searchAssetsViaPixabay(query, type, maxResults) {
    if (!PIXABAY_API_KEY) return []
    const isVideo = type === 'video'
    const baseUrl = isVideo ? 'https://pixabay.com/api/videos/' : 'https://pixabay.com/api/'
    const params = new URLSearchParams({
      key: PIXABAY_API_KEY,
      q: query,
      per_page: String(maxResults),
    })
    if (!isVideo) {
      params.set('image_type', 'photo')
      params.set('safesearch', 'true')
    }

    const payload = await fetchJsonWithTimeout(`${baseUrl}?${params.toString()}`)
    const rows = Array.isArray(payload?.hits) ? payload.hits : []
    return rows
      .map((item) => {
        if (isVideo) {
          const video = item?.videos?.medium || item?.videos?.small || item?.videos?.tiny
          return normalizeAssetResult({
            id: item?.id,
            title: item?.tags || `Pixabay video`,
            provider: 'pixabay',
            assetType: 'video',
            url: item?.pageURL,
            sourcePageUrl: item?.pageURL,
            thumbnailUrl: item?.userImageURL || undefined,
            importUrl: video?.url,
            width: video?.width,
            height: video?.height,
            durationSeconds: item?.duration,
            license: 'Pixabay License',
            author: item?.user,
          })
        }

        return normalizeAssetResult({
          id: item?.id,
          title: item?.tags || `Pixabay image`,
          provider: 'pixabay',
          assetType: 'image',
          url: item?.pageURL,
          sourcePageUrl: item?.pageURL,
          thumbnailUrl: item?.previewURL || item?.webformatURL,
          importUrl: item?.largeImageURL || item?.webformatURL,
          width: item?.imageWidth,
          height: item?.imageHeight,
          license: 'Pixabay License',
          author: item?.user,
        })
      })
      .filter(Boolean)
  }

  async function searchAssetsViaYoutube(query, maxResults) {
    if (!YOUTUBE_API_KEY) return []
    const params = new URLSearchParams({
      key: YOUTUBE_API_KEY,
      part: 'snippet',
      type: 'video',
      maxResults: String(maxResults),
      q: query,
      safeSearch: 'moderate',
    })
    const payload = await fetchJsonWithTimeout(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`)
    const rows = Array.isArray(payload?.items) ? payload.items : []
    return rows
      .map((item) => {
        const videoId = item?.id?.videoId
        if (!videoId) return null
        const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
        return normalizeAssetResult({
          id: videoId,
          title: item?.snippet?.title || 'YouTube video',
          provider: 'youtube',
          assetType: 'video',
          url: watchUrl,
          sourcePageUrl: watchUrl,
          thumbnailUrl:
            item?.snippet?.thumbnails?.high?.url ||
            item?.snippet?.thumbnails?.medium?.url ||
            item?.snippet?.thumbnails?.default?.url,
          importUrl: null,
          license: 'YouTube Terms',
          author: item?.snippet?.channelTitle,
        })
      })
      .filter(Boolean)
  }

  function inferReferenceProvider(url) {
    try {
      const host = new URL(url).hostname.toLowerCase()
      if (host.includes('pinterest.')) return 'pinterest'
      if (host.includes('dribbble.')) return 'dribbble'
      if (host.includes('behance.')) return 'behance'
      return 'web'
    } catch {
      return 'web'
    }
  }

  function firstNonEmptyString(values) {
    for (const value of values) {
      if (typeof value !== 'string') continue
      const trimmed = value.trim()
      if (trimmed) return trimmed
    }
    return ''
  }

  function extractPinterestImageUrl(pin) {
    const direct = firstNonEmptyString([
      pin?.image_original_url,
      pin?.image_url,
      pin?.media?.image_url,
      pin?.media?.cover_image_url,
      pin?.media?.images?.orig?.url,
      pin?.images?.orig?.url,
    ])
    if (direct) return direct

    const pools = [
      pin?.media?.images,
      pin?.images,
      pin?.media_images,
      pin?.image_sizes,
    ]
    for (const pool of pools) {
      if (!pool || typeof pool !== 'object') continue
      const values = Object.values(pool)
      for (const value of values) {
        if (!value || typeof value !== 'object') continue
        const url = firstNonEmptyString([value.url, value.link, value.src])
        if (url) return url
      }
    }
    return ''
  }

  function normalizePinterestAsset(item) {
    const pinId = firstNonEmptyString([String(item?.id || ''), String(item?.pin_id || '')])
    const sourcePageUrl = firstNonEmptyString([
      item?.link,
      item?.url,
      pinId ? `https://www.pinterest.com/pin/${pinId}/` : '',
    ])
    const imageUrl = extractPinterestImageUrl(item)
    const mediaTypeRaw = firstNonEmptyString([
      item?.media_type,
      item?.media?.media_type,
      item?.pin_media_source?.source_type,
    ]).toLowerCase()

    return normalizeAssetResult({
      id: pinId || undefined,
      title: firstNonEmptyString([item?.title, item?.description, 'Pinterest pin']),
      provider: 'pinterest',
      assetType: mediaTypeRaw.includes('video') ? 'video' : 'image',
      url: sourcePageUrl || imageUrl,
      sourcePageUrl: sourcePageUrl || imageUrl,
      thumbnailUrl: imageUrl || undefined,
      importUrl: imageUrl || undefined,
      width: Number(item?.media?.images?.orig?.width || item?.images?.orig?.width),
      height: Number(item?.media?.images?.orig?.height || item?.images?.orig?.height),
      license: 'Pinterest Terms',
      author: firstNonEmptyString([item?.creator?.username, item?.creator?.id, item?.owner?.username]),
    })
  }

  async function searchAssetsViaPinterestApi(query, maxResults) {
    if (!PINTEREST_ACCESS_TOKEN) return []

    const headers = {
      Accept: 'application/json',
      Authorization: `Bearer ${PINTEREST_ACCESS_TOKEN}`,
    }
    const limit = clampInteger(maxResults, 1, 50, 12)
    const endpoints = []
    if (PINTEREST_ENABLE_PARTNER_SEARCH) {
      const partnerParams = new URLSearchParams({
        term: query,
        country_code: PINTEREST_COUNTRY_CODE,
        locale: PINTEREST_LOCALE,
        limit: String(limit),
      })
      endpoints.push(`https://api.pinterest.com/v5/search/partner/pins?${partnerParams.toString()}`)
    }
    const userParams = new URLSearchParams({
      query,
      page_size: String(limit),
    })
    endpoints.push(`https://api.pinterest.com/v5/search/pins?${userParams.toString()}`)

    let lastError = null
    for (const endpoint of endpoints) {
      try {
        const payload = await fetchJsonWithTimeout(endpoint, { headers })
        const rows = Array.isArray(payload?.items) ? payload.items : []
        const results = rows.map((item) => normalizePinterestAsset(item)).filter(Boolean)
        if (results.length > 0) {
          return results.slice(0, limit)
        }
      } catch (error) {
        lastError = error
      }
    }

    if (lastError) {
      throw lastError
    }
    return []
  }

  async function searchReferenceAssets(query, maxResults, sites) {
    const siteQuery = sites.map((site) => `site:${site}`).join(' OR ')
    const searchQuery = `${query} (${siteQuery})`
    const web = await searchWeb(searchQuery, { maxResults })
    return (web.results || [])
      .map((item, index) =>
        normalizeAssetResult({
          id: `ref-${index}-${Math.random().toString(36).slice(2, 7)}`,
          title: item.title || item.url,
          provider: inferReferenceProvider(item.url),
          assetType: 'link',
          url: item.url,
          sourcePageUrl: item.url,
          thumbnailUrl: item.thumbnailUrl,
          importUrl: null,
          license: 'Reference only',
        }),
      )
      .filter(Boolean)
  }

  function uniqueAssetsByUrl(items) {
    const seen = new Set()
    const result = []
    for (const item of items) {
      const key = String(item?.url || '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      result.push(item)
    }
    return result
  }

  async function searchAssets(query, options = {}) {
    const type = normalizeAssetType(options?.type)
    const provider = normalizeAssetProvider(options?.provider)
    const maxResults = clampInteger(options?.maxResults, 1, 30, 12)

    const requestedProviders = provider === 'auto'
      ? (() => {
        if (type === 'gif') return ['giphy']
        if (type === 'video') return ['pexels', 'youtube', 'pixabay', 'web']
        if (type === 'image') return ['pexels', 'unsplash', 'pixabay', 'pinterest']
        return ['pexels', 'unsplash', 'giphy', 'pixabay', 'youtube', 'pinterest']
      })()
      : [provider]

    const perProvider = clampInteger(Math.ceil(maxResults / requestedProviders.length) + 1, 2, 15, 6)
    const warnings = []
    const collected = []

    for (const currentProvider of requestedProviders) {
      try {
        if (currentProvider === 'pexels') {
          const pexelsType = type === 'gif' ? 'image' : type === 'mixed' ? 'image' : type
          collected.push(...(await searchAssetsViaPexels(query, pexelsType, perProvider)))
          if (type === 'mixed' && collected.length < maxResults) {
            collected.push(...(await searchAssetsViaPexels(query, 'video', Math.max(2, Math.floor(perProvider / 2)))))
          }
        } else if (currentProvider === 'unsplash') {
          collected.push(...(await searchAssetsViaUnsplash(query, perProvider)))
        } else if (currentProvider === 'giphy') {
          collected.push(...(await searchAssetsViaGiphy(query, perProvider)))
        } else if (currentProvider === 'pixabay') {
          const pixabayType = type === 'video' ? 'video' : 'image'
          collected.push(...(await searchAssetsViaPixabay(query, pixabayType, perProvider)))
        } else if (currentProvider === 'youtube') {
          collected.push(...(await searchAssetsViaYoutube(query, perProvider)))
        } else if (currentProvider === 'pinterest') {
          const pinterestApiResults = await searchAssetsViaPinterestApi(query, perProvider)
          if (pinterestApiResults.length > 0) {
            collected.push(...pinterestApiResults)
          } else {
            collected.push(...(await searchReferenceAssets(query, perProvider, ['pinterest.com', 'dribbble.com', 'behance.net'])))
          }
        } else if (currentProvider === 'web') {
          collected.push(...(await searchReferenceAssets(query, perProvider, ['pinterest.com', 'dribbble.com', 'behance.net', 'vimeo.com'])))
        }
      } catch (error) {
        warnings.push({
          provider: currentProvider,
          error: error instanceof Error ? error.message : 'Provider search failed.',
        })
      }
    }

    const filtered = uniqueAssetsByUrl(collected).slice(0, maxResults)
    if (filtered.length === 0) {
      const warningText = warnings.length > 0
        ? warnings.map((entry) => `${entry.provider}: ${entry.error}`).join(' | ')
        : 'No results.'
      throw new Error(`No assets found. ${warningText}`)
    }

    return {
      provider: provider === 'auto' ? 'multi' : provider,
      type,
      license: String(options?.license || 'any'),
      results: filtered,
      warnings,
    }
  }

  function inferMediaKindFromMimeType(mimeType, fallbackUrl) {
    const lowerMime = String(mimeType || '').toLowerCase()
    if (lowerMime.includes('gif')) return 'gif'
    if (lowerMime.startsWith('video/')) return 'video'
    const lowerUrl = String(fallbackUrl || '').toLowerCase()
    if (lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?')) return 'gif'
    if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(lowerUrl)) return 'video'
    return 'image'
  }

  function filenameFromRemoteUrl(remoteUrl, fallbackExt) {
    try {
      const parsed = new URL(remoteUrl)
      const baseName = path.basename(parsed.pathname)
      if (baseName && baseName !== '/' && baseName !== '.') return baseName
    } catch {
      // ignore
    }
    const ext = fallbackExt || '.bin'
    return `import-${Date.now()}${ext}`
  }
  return {
    searchWeb,
    getRoutePlan,
    searchAssets,
    inferMediaKindFromMimeType,
    filenameFromRemoteUrl,
  }
}
