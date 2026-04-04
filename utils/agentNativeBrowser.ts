import { existsSync } from "node:fs"
import path from "path"

export function resolveAgentNativeBrowserExecutable(
  options: {
    env?: NodeJS.ProcessEnv
    platform?: NodeJS.Platform
  } = {}
) {
  const env = options.env || process.env
  const explicit =
    (typeof env.AGENT_NATIVE_BROWSER_PATH === "string" && env.AGENT_NATIVE_BROWSER_PATH.trim()) ||
    (typeof env.PLAYWRIGHT_EXECUTABLE_PATH === "string" && env.PLAYWRIGHT_EXECUTABLE_PATH.trim()) ||
    ""

  if (explicit) {
    const resolved = path.resolve(explicit)
    return existsSync(resolved) ? resolved : null
  }

  const platform = options.platform || process.platform

  const candidates =
    platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        ]
      : platform === "win32"
        ? [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
            "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
          ]
        : [
            "/usr/bin/google-chrome",
            "/usr/bin/google-chrome-stable",
            "/usr/bin/chromium",
            "/usr/bin/chromium-browser",
            "/snap/bin/chromium",
            "/usr/bin/microsoft-edge",
          ]

  for (const candidate of candidates) {
    try {
      const normalized = path.resolve(candidate)
      if (typeof normalized === "string" && normalized && existsSync(normalized)) {
        return normalized
      }
    } catch {
      // Ignore invalid candidate paths.
    }
  }

  return null
}
