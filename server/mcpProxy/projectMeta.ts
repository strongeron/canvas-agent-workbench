import { randomBytes } from "node:crypto"
import { promises as fs } from "node:fs"
import path from "node:path"

export interface ProjectMetaRecord {
  label?: string
  mcpAppCreds?: Record<string, string | Record<string, string>>
  mcpAppStdioAllowlist?: string[]
  mcpAppHttpAllowlist?: string[]
  [key: string]: unknown
}

export async function readProjectMeta(projectDir: string, projectId: string) {
  const metaPath = path.join(projectDir, "project.json")
  try {
    const raw = await fs.readFile(metaPath, "utf8")
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object") return parsed as ProjectMetaRecord
  } catch {
    // fall through
  }
  return { label: projectId }
}

export async function writeProjectMetaAtomic(projectDir: string, meta: ProjectMetaRecord) {
  const metaPath = path.join(projectDir, "project.json")
  const nextRaw = JSON.stringify(meta, null, 2)
  const token = randomBytes(6).toString("hex")
  const tmpPath = `${metaPath}.${token}.tmp`
  // 0o600: owner read+write only. project.json holds plaintext MCP-app
  // credentials, so group / other readability would expose them to any
  // other user on the host. The mode applies to the new tmp file and is
  // preserved across rename.
  await fs.writeFile(tmpPath, nextRaw, { encoding: "utf8", mode: 0o600 })
  await fs.rename(tmpPath, metaPath)
  // Defensive chmod in case the file pre-existed with a wider mode and
  // the previous writer did not narrow it. Best-effort: on platforms that
  // ignore mode (Windows) this is a no-op.
  try {
    await fs.chmod(metaPath, 0o600)
  } catch {
    // ignore — best-effort tightening
  }
}

export async function readMcpAppCreds(projectDir: string, projectId: string) {
  const meta = await readProjectMeta(projectDir, projectId)
  const creds = meta.mcpAppCreds
  if (!creds || typeof creds !== "object" || Array.isArray(creds)) {
    return {} as Record<string, string | Record<string, string>>
  }
  return creds as Record<string, string | Record<string, string>>
}

export async function writeMcpAppSecret(
  projectDir: string,
  projectId: string,
  ref: string,
  secret: string | Record<string, string>
) {
  const meta = await readProjectMeta(projectDir, projectId)
  const currentCreds =
    meta.mcpAppCreds && typeof meta.mcpAppCreds === "object" && !Array.isArray(meta.mcpAppCreds)
      ? meta.mcpAppCreds
      : {}
  await writeProjectMetaAtomic(projectDir, {
    ...meta,
    mcpAppCreds: {
      ...currentCreds,
      [ref]: secret,
    },
  })
}
