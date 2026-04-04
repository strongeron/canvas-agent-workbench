import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import pixelmatch from "pixelmatch"
import { chromium } from "playwright-core"
import { PNG } from "pngjs"

import { resolveAgentNativeBrowserExecutable } from "../utils/agentNativeBrowser.ts"

const WORKSPACE_ROOT = "/Users/strongeron/Evil Martians/Open Source/gallery-poc"
const BASELINE_DIR = path.join(WORKSPACE_ROOT, "tests", "visual-baselines")
const NODE_CATALOG_BASELINE_PATH = path.join(
  BASELINE_DIR,
  "node-catalog-state-preview.png"
)

function parseArgs(argv) {
  const args = {
    update: false,
    serverUrl: "http://127.0.0.1:5178",
  }

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (value === "--update") {
      args.update = true
      continue
    }
    if (value === "--server" && typeof argv[index + 1] === "string") {
      args.serverUrl = argv[index + 1]
      index += 1
    }
  }

  return args
}

function parsePng(buffer) {
  return PNG.sync.read(buffer)
}

async function assertServerReachable(serverUrl) {
  const response = await fetch(serverUrl, { redirect: "manual" }).catch(() => null)
  if (!response || !response.ok) {
    throw new Error(
      `No live dev server responded at ${serverUrl}. Start the app first with "npm run dev".`
    )
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const executablePath = resolveAgentNativeBrowserExecutable()
  if (!executablePath) {
    throw new Error(
      "No browser executable was found. Set AGENT_NATIVE_BROWSER_PATH or PLAYWRIGHT_EXECUTABLE_PATH."
    )
  }

  await assertServerReachable(args.serverUrl)

  const browser = await chromium.launch({
    executablePath,
    headless: true,
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  })

  try {
    const page = await context.newPage()
    const pageErrors = []
    const consoleErrors = []
    page.on("pageerror", (error) => {
      pageErrors.push(error.message)
    })
    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text()
        if (text.includes("favicon.ico") || text.includes("Failed to load resource: the server responded with a status of 404")) {
          return
        }
        consoleErrors.push(text)
      }
    })

    await page.goto(`${args.serverUrl.replace(/\/$/, "")}/node-catalog?project=demo`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    })
    await page.waitForSelector('[data-node-catalog-root="true"]', { timeout: 60_000 })
    await page.waitForSelector('[data-node-catalog-state-preview="true"]', {
      timeout: 60_000,
    })
    await page.waitForTimeout(500)

    if (pageErrors.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        [
          pageErrors.length > 0 ? `Page errors: ${pageErrors.join(" | ")}` : null,
          consoleErrors.length > 0 ? `Console errors: ${consoleErrors.join(" | ")}` : null,
        ]
          .filter(Boolean)
          .join("\n\n")
      )
    }

    const target = page.locator('[data-node-catalog-state-preview="true"]')
    const actualBuffer = Buffer.from(
      await target.screenshot({
        type: "png",
        animations: "disabled",
      })
    )

    await mkdir(BASELINE_DIR, { recursive: true })
    if (args.update) {
      await writeFile(NODE_CATALOG_BASELINE_PATH, actualBuffer)
      process.stdout.write(
        JSON.stringify(
          {
            ok: true,
            updated: true,
            baselinePath: NODE_CATALOG_BASELINE_PATH,
          },
          null,
          2
        ) + "\n"
      )
      return
    }

    const expectedBuffer = await readFile(NODE_CATALOG_BASELINE_PATH)
    const actual = parsePng(actualBuffer)
    const expected = parsePng(expectedBuffer)

    if (actual.width !== expected.width || actual.height !== expected.height) {
      throw new Error(
        `Visual baseline dimensions changed. Expected ${expected.width}x${expected.height}, got ${actual.width}x${actual.height}.`
      )
    }

    const diff = new PNG({ width: actual.width, height: actual.height })
    const mismatchPixels = pixelmatch(
      expected.data,
      actual.data,
      diff.data,
      actual.width,
      actual.height,
      {
        threshold: 0.15,
      }
    )
    const mismatchRatio = mismatchPixels / (actual.width * actual.height)

    if (mismatchRatio > 0.0025) {
      const diffDir = await mkdtemp(path.join(tmpdir(), "agent-native-visual-"))
      await Promise.all([
        writeFile(path.join(diffDir, "expected.png"), expectedBuffer),
        writeFile(path.join(diffDir, "actual.png"), actualBuffer),
        writeFile(path.join(diffDir, "diff.png"), PNG.sync.write(diff)),
      ])
      throw new Error(
        `Visual diff exceeded threshold (${mismatchRatio.toFixed(4)}). Diff assets: ${diffDir}`
      )
    }

    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          mismatchPixels,
          mismatchRatio,
          baselinePath: NODE_CATALOG_BASELINE_PATH,
        },
        null,
        2
      ) + "\n"
    )
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`)
  process.exitCode = 1
})
