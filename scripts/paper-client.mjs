/**
 * Example Paper MCP client module.
 *
 * Replace the methods below with your real MCP client implementation.
 * Then run:
 *
 *   npm run dev:paper
 *
 * This file will be loaded by the Vite server via PAPER_MCP_CLIENT_MODULE.
 */

function notImplemented(method) {
  throw new Error(`Paper MCP client not implemented: ${method}`)
}

const paperClient = {
  async getBasicInfo() {
    return notImplemented("getBasicInfo")
  },
  async getSelection() {
    return notImplemented("getSelection")
  },
  async getNodeInfo() {
    return notImplemented("getNodeInfo")
  },
  async getChildren() {
    return notImplemented("getChildren")
  },
  async getScreenshot() {
    return notImplemented("getScreenshot")
  },
  async getJSX() {
    return notImplemented("getJSX")
  },
  async getComputedStyles() {
    return notImplemented("getComputedStyles")
  },
  async getFillImage() {
    return notImplemented("getFillImage")
  },
}

export default paperClient
