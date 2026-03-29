import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"

type NodeRequestWithBody = IncomingMessage & {
  body?: unknown
}

type SingleRouteApp = {
  fetch(request: Request): Promise<Response> | Response
}

type MiddlewareNext = (error?: unknown) => void

type CopilotNodeHandler = (req: NodeRequestWithBody, res: ServerResponse) => Promise<void>

interface CopilotViteMiddlewareOptions {
  basePath?: string
  ensureRuntime: () => Promise<void>
  getRuntimeHandler: () => CopilotNodeHandler | null
  getRuntimeError: () => string | null
  sendJson: (res: ServerResponse, status: number, payload: Record<string, unknown>) => void
}

function toWebHeaders(rawHeaders: IncomingMessage["headers"]) {
  const headers = new Headers()

  for (const [key, value] of Object.entries(rawHeaders || {})) {
    if (value == null) continue

    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry))
      continue
    }

    headers.append(key, value)
  }

  return headers
}

function getRequestUrl(req: IncomingMessage) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost"
  const proto =
    req.headers["x-forwarded-proto"] ||
    ((req.socket as { encrypted?: boolean })?.encrypted ? "https" : "http")

  return `${proto}://${host}${req.url || "/"}`
}

function serializeParsedBody(parsedBody: unknown, headers: Headers) {
  if (parsedBody === undefined) {
    return { body: undefined, headers }
  }

  const nextHeaders = new Headers(headers)
  nextHeaders.delete("content-length")

  if (parsedBody === null) {
    if (!nextHeaders.has("content-type")) {
      nextHeaders.set("content-type", "application/json")
    }
    return { body: "null", headers: nextHeaders }
  }

  if (parsedBody instanceof Buffer || parsedBody instanceof Uint8Array) {
    return { body: parsedBody, headers: nextHeaders }
  }

  if (typeof parsedBody === "string") {
    if (!nextHeaders.has("content-type")) {
      nextHeaders.set("content-type", "text/plain;charset=UTF-8")
    }
    return { body: parsedBody, headers: nextHeaders }
  }

  if (parsedBody instanceof URLSearchParams) {
    if (!nextHeaders.has("content-type")) {
      nextHeaders.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8")
    }
    return { body: parsedBody, headers: nextHeaders }
  }

  if (!nextHeaders.has("content-type")) {
    nextHeaders.set("content-type", "application/json")
  }

  return {
    body: JSON.stringify(parsedBody),
    headers: nextHeaders,
  }
}

export function createWebRequestFromNode(req: NodeRequestWithBody) {
  const method = req.method || "GET"
  const headers = toWebHeaders(req.headers)
  const url = getRequestUrl(req)
  const hasBody = method !== "GET" && method !== "HEAD"

  if (!hasBody) {
    return new Request(url, { method, headers })
  }

  if (req.body !== undefined) {
    const serialized = serializeParsedBody(req.body, headers)
    return new Request(url, {
      method,
      headers: serialized.headers,
      body: serialized.body,
      duplex: "half",
    } as RequestInit)
  }

  return new Request(url, {
    method,
    headers,
    body: Readable.toWeb(req as unknown as Readable),
    duplex: "half",
  } as RequestInit)
}

export async function writeWebResponse(res: ServerResponse, response: Response) {
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })

  if (!response.body) {
    res.end()
    return
  }

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.fromWeb(response.body as any)
    stream.on("error", reject)
    res.on("error", reject)
    res.on("finish", resolve)
    stream.pipe(res)
  })
}

export function createCopilotSingleRouteNodeHandler(app: SingleRouteApp) {
  return async (req: NodeRequestWithBody, res: ServerResponse) => {
    const request = createWebRequestFromNode(req)
    const response = await app.fetch(request)
    await writeWebResponse(res, response)
  }
}

export function createCopilotViteMiddleware({
  basePath = "/api/copilotkit",
  ensureRuntime,
  getRuntimeHandler,
  getRuntimeError,
  sendJson,
}: CopilotViteMiddlewareOptions) {
  return async (req: NodeRequestWithBody, res: ServerResponse, next: MiddlewareNext) => {
    const requestUrl = typeof req.url === "string" ? req.url : ""
    if (!requestUrl.startsWith(basePath)) {
      next()
      return
    }

    try {
      await ensureRuntime()
      const runtimeHandler = getRuntimeHandler()
      if (!runtimeHandler) {
        sendJson(res, 501, {
          error: getRuntimeError() || "CopilotKit runtime is not initialized.",
        })
        return
      }
      await runtimeHandler(req, res)
    } catch (error) {
      next(error)
    }
  }
}
