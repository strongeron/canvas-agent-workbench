import fs from "node:fs"
import path from "node:path"

const projectsRoot = path.resolve("projects")

// Read local-scan project configs from projects/<id>/project.json.
// Returns { projectId, repoPath }[] for enabled projects with valid paths.
// Shared between tailwind.config.js and vite.config.ts to avoid divergent validation.
export function readLocalScanProjects() {
  if (!fs.existsSync(projectsRoot)) return []

  let entries
  try {
    entries = fs
      .readdirSync(projectsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
  } catch {
    return []
  }

  return entries.flatMap((entry) => {
    const metaPath = path.join(projectsRoot, entry.name, "project.json")
    if (!fs.existsSync(metaPath)) return []

    let meta
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8"))
    } catch {
      return []
    }

    const localScan = meta?.localScan
    if (!localScan || typeof localScan !== "object") return []
    if (localScan.enabled === false) return []
    if (typeof localScan.repoPath !== "string" || !localScan.repoPath.trim()) return []

    const repoPath = path.resolve(localScan.repoPath.trim())
    if (!fs.existsSync(repoPath)) return []

    return [{ projectId: entry.name, repoPath }]
  })
}
