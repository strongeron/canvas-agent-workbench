import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { pathToFileURL } from 'node:url'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import {
  createPaperGalleryEntry,
  formatPaperComponentSource,
  formatPaperGalleryEntrySource,
  importPaperSelection,
  slugify,
  toPascalCase,
} from './core/mcp/paper'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROJECTS_ROOT = path.resolve(__dirname, 'projects')
const PAPER_MCP_MODULE = process.env.PAPER_MCP_CLIENT_MODULE
let cachedPaperClient = null
let attemptedPaperClientLoad = false

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

async function readJson(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  const body = Buffer.concat(chunks).toString('utf8')
  if (!body) return {}
  return JSON.parse(body)
}

function uniqueName(baseName, componentDir, configDir) {
  const baseSlug = slugify(baseName)
  const baseComponent = toPascalCase(baseName)
  let slug = baseSlug
  let componentName = baseComponent
  let suffix = 1

  const hasConflict = () => {
    const componentPath = path.join(componentDir, `${componentName}.tsx`)
    const configPath = path.join(configDir, `${slug}.gallery.ts`)
    return existsSync(componentPath) || existsSync(configPath)
  }

  while (hasConflict()) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
    componentName = `${baseComponent}${suffix}`
  }

  return { slug, componentName }
}

async function ensureProjectScaffold(projectId, label) {
  const projectDir = path.join(PROJECTS_ROOT, projectId)
  await fs.mkdir(path.join(projectDir, 'components', 'paper'), { recursive: true })
  await fs.mkdir(path.join(projectDir, 'configs', 'paper'), { recursive: true })

  const metaPath = path.join(projectDir, 'project.json')
  if (!existsSync(metaPath)) {
    const meta = {
      label: label || projectId,
    }
    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2))
  }

  return projectDir
}

async function resolvePaperMcpClient() {
  if (cachedPaperClient) return cachedPaperClient
  if (attemptedPaperClientLoad) return null
  attemptedPaperClientLoad = true

  const globalClient = globalThis?.paperMcp || globalThis?.mcp?.paper
  if (globalClient) {
    cachedPaperClient = globalClient
    return cachedPaperClient
  }

  if (!PAPER_MCP_MODULE) return null

  try {
    const resolved = path.isAbsolute(PAPER_MCP_MODULE)
      ? PAPER_MCP_MODULE
      : path.resolve(__dirname, PAPER_MCP_MODULE)
    const mod = await import(pathToFileURL(resolved).href)
    cachedPaperClient =
      mod?.default ||
      mod?.paperMcp ||
      mod?.client ||
      mod?.mcp?.paper ||
      null
    return cachedPaperClient
  } catch (error) {
    console.warn('[paper import] Failed to load PAPER_MCP_CLIENT_MODULE:', error)
    return null
  }
}

async function updateProjectRegistry(projectDir, entryId, kind) {
  const registryPath = path.join(projectDir, 'registry.json')
  const fallback = { ui: [], page: [] }
  let registry = fallback

  if (existsSync(registryPath)) {
    try {
      const raw = await fs.readFile(registryPath, 'utf8')
      registry = JSON.parse(raw)
    } catch {
      registry = fallback
    }
  }

  const normalized = {
    ui: Array.isArray(registry.ui) ? registry.ui : [],
    page: Array.isArray(registry.page) ? registry.page : [],
  }

  const bucket = kind === 'page' ? 'page' : 'ui'
  const other = bucket === 'page' ? 'ui' : 'page'
  if (!normalized[bucket].includes(entryId)) {
    normalized[bucket].push(entryId)
  }
  normalized[other] = normalized[other].filter((id) => id !== entryId)

  await fs.writeFile(registryPath, JSON.stringify(normalized, null, 2))
}

function paperImportPlugin() {
  return {
    name: 'paper-import',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next()

        if (req.method === 'POST' && req.url === '/api/projects/create') {
          try {
            const body = await readJson(req)
            const rawId = typeof body.id === 'string' ? body.id : ''
            const label = typeof body.label === 'string' ? body.label : rawId
            if (!rawId) {
              return sendJson(res, 400, { error: 'Project id is required.' })
            }
            const projectId = slugify(rawId)
            await ensureProjectScaffold(projectId, label)
            return sendJson(res, 200, { ok: true, projectId })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Failed to create project.' })
          }
        }

        if (req.method === 'POST' && req.url === '/api/paper/import') {
          try {
            const body = await readJson(req)
            const projectId = typeof body.projectId === 'string' ? body.projectId : ''
            if (!projectId) {
              return sendJson(res, 400, { error: 'projectId is required.' })
            }

            let jsx = typeof body.jsx === 'string' ? body.jsx : ''
            let name = typeof body.name === 'string' ? body.name : ''
            let selectionMeta = body.selection || null
            let basicInfo = null

            if (!jsx) {
              const client = await resolvePaperMcpClient()
              if (!client) {
                return sendJson(res, 501, {
                  error: 'Paper MCP client not available server-side. Set PAPER_MCP_CLIENT_MODULE or inject global mcp client.',
                })
              }

              try {
                basicInfo = await client.getBasicInfo?.()
              } catch {
                basicInfo = null
              }

              const selection = await importPaperSelection(client, { format: body.format || 'tailwind' })
              jsx = selection.jsx
              name = name || selection.name
              selectionMeta = {
                name: selection.name,
                nodeId: selection.nodeId,
                width: selection.width,
                height: selection.height,
                fileName: basicInfo?.fileName,
                pageName: basicInfo?.pageName,
              }
            }

            if (!jsx) {
              return sendJson(res, 400, { error: 'jsx is required.' })
            }

            const projectDir = await ensureProjectScaffold(projectId, body.label)
            const componentDir = path.join(projectDir, 'components', 'paper')
            const configDir = path.join(projectDir, 'configs', 'paper')

            const baseName =
              typeof name === 'string' && name.trim()
                ? name.trim()
                : 'PaperComponent'
            const { slug, componentName } = uniqueName(baseName, componentDir, configDir)

            const importPath = `@project/${projectId}/components/paper/${componentName}`
            const descriptionParts = []
            if (selectionMeta?.fileName) descriptionParts.push(selectionMeta.fileName)
            if (selectionMeta?.nodeId) descriptionParts.push(`node ${selectionMeta.nodeId}`)
            const description = descriptionParts.length > 0
              ? `Imported from Paper (${descriptionParts.join(' · ')})`
              : 'Imported from Paper MCP'

            const entry = createPaperGalleryEntry({
              id: `paper/${slug}`,
              name: componentName,
              importPath,
              description,
            })

            const headerLines = [
              '/**',
              ' * from Paper',
              body.source?.url ? ` * ${body.source.url}` : null,
              body.source?.importedAt ? ` * on ${body.source.importedAt}` : null,
              ' */',
              '',
            ].filter(Boolean)

            const componentSource = `${headerLines.join('\n')}${formatPaperComponentSource(jsx, componentName)}`
            const entrySource = formatPaperGalleryEntrySource(entry, {
              exportName: `${componentName}Entry`,
              coreImportPath: '../../../core',
            })

            await fs.writeFile(path.join(componentDir, `${componentName}.tsx`), componentSource)
            await fs.writeFile(path.join(configDir, `${slug}.gallery.ts`), entrySource)
            const kind = body.kind === 'page' ? 'page' : 'ui'
            await updateProjectRegistry(projectDir, entry.id, kind)

            return sendJson(res, 200, {
              ok: true,
              componentId: entry.id,
              componentName,
              importPath,
              reload: true,
              selection: selectionMeta,
            })
          } catch (error) {
            return sendJson(res, 500, { error: error?.message || 'Paper import failed.' })
          }
        }

        return next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), paperImportPlugin()],
  resolve: {
    alias: [
      {
        find: '@inertiajs/react',
        replacement: path.resolve(__dirname, './demo-thicket/shims/inertia-react.tsx'),
      },
      {
        find: /^@thicket\/(.*)$/,
        replacement: path.resolve(__dirname, './demo-thicket/$1'),
      },
      {
        find: '@thicket',
        replacement: path.resolve(__dirname, './demo-thicket'),
      },
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, './$1'),
      },
      {
        find: /^@project\/(.*)$/,
        replacement: path.resolve(__dirname, './projects/$1'),
      },
      {
        find: '@project',
        replacement: path.resolve(__dirname, './projects'),
      },
    ],
  },
  server: {
    fs: {
      allow: [__dirname],
    },
  },
  root: 'demo',
  publicDir: false,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
})
