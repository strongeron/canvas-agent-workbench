import { existsSync } from "node:fs"
import { promises as fs } from "node:fs"
import path from "node:path"

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "project"
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === "--id") {
      out.id = args[i + 1]
      i += 1
      continue
    }
    if (arg === "--label") {
      out.label = args[i + 1]
      i += 1
    }
  }
  return out
}

async function main() {
  const { id, label } = parseArgs()
  if (!id) {
    console.error("Usage: npm run create-project -- --id <project-id> [--label \"Label\"]")
    process.exit(1)
  }

  const projectId = slugify(id)
  const projectDir = path.resolve(process.cwd(), "projects", projectId)
  await fs.mkdir(path.join(projectDir, "components", "paper"), { recursive: true })
  await fs.mkdir(path.join(projectDir, "configs", "paper"), { recursive: true })

  const metaPath = path.join(projectDir, "project.json")
  if (!existsSync(metaPath)) {
    await fs.writeFile(metaPath, JSON.stringify({ label: label || id }, null, 2))
  }

  const registryPath = path.join(projectDir, "registry.json")
  if (!existsSync(registryPath)) {
    await fs.writeFile(registryPath, JSON.stringify({ ui: [], page: [] }, null, 2))
  }

  console.log(`Project created: ${projectId}`)
}

main().catch((error) => {
  console.error("Failed to create project:", error)
  process.exit(1)
})
