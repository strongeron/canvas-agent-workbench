import { describe, expect, it } from "vitest"

import { resolveAgentNativeBrowserExecutable } from "../utils/agentNativeBrowser"

describe("agent native browser", () => {
  it("prefers an explicit browser path from env", () => {
    expect(
      resolveAgentNativeBrowserExecutable({
        env: {
          AGENT_NATIVE_BROWSER_PATH: process.execPath,
        },
        platform: "darwin",
      })
    ).toBe(process.execPath)
  })

  it("returns null for an unavailable explicit browser path", () => {
    expect(
      resolveAgentNativeBrowserExecutable({
        env: {
          AGENT_NATIVE_BROWSER_PATH: "/tmp/does-not-exist-browser",
        },
        platform: "linux",
      })
    ).toBeNull()
  })
})
