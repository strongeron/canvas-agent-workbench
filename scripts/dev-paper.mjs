import { spawn } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function parseArgs() {
  const args = process.argv.slice(2)
  let paperClient = null
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--paper-client") {
      paperClient = args[i + 1]
      i += 1
    }
  }
  return { paperClient }
}

const { paperClient } = parseArgs()
const modulePath = paperClient
  ? path.resolve(process.cwd(), paperClient)
  : path.resolve(__dirname, "paper-client.mjs")

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
const child = spawn(npmCmd, ["run", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PAPER_MCP_CLIENT_MODULE: modulePath,
  },
})

child.on("exit", (code) => {
  process.exit(code ?? 0)
})
