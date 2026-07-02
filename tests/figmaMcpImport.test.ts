import { describe, expect, it } from "vitest"

import {
  assertValidFigmaUrl,
  buildFigmaContextHtml,
  buildFigmaToolArgs,
  extractFigmaMcpArtifacts,
  parseFigmaUrlParts,
} from "../utils/figmaMcpImport"

describe("figma MCP import helpers", () => {
  it("accepts Figma frame or layer URLs with node ids", () => {
    expect(() =>
      assertValidFigmaUrl("https://www.figma.com/design/abc123/Name?node-id=12-34")
    ).not.toThrow()
  })

  it("rejects non-Figma or node-less URLs before invoking MCP tools", () => {
    expect(() => assertValidFigmaUrl("https://example.com/design/abc?node-id=1-2")).toThrow(
      "figma.com"
    )
    expect(() => assertValidFigmaUrl("https://www.figma.com/design/abc123/Name")).toThrow(
      "node-id"
    )
  })

  it("extracts file key and node id from Figma URLs", () => {
    expect(
      parseFigmaUrlParts("https://www.figma.com/design/abc123/Name?node-id=12-34")
    ).toEqual({
      fileKey: "abc123",
      nodeId: "12:34",
    })
    expect(parseFigmaUrlParts("https://www.figma.com/proto/protoKey/Name?node-id=7-8")).toEqual({
      fileKey: "protoKey",
      nodeId: "7:8",
    })
  })

  it("builds schema-aware Figma tool arguments", () => {
    expect(
      buildFigmaToolArgs(
        {
          inputSchema: {
            type: "object",
            properties: {
              fileKey: { type: "string" },
              nodeId: { type: "string" },
              clientFrameworks: { type: "string" },
            },
          },
        },
        "https://www.figma.com/design/abc123/Name?node-id=12-34"
      )
    ).toEqual({
      fileKey: "abc123",
      nodeId: "12:34",
      clientFrameworks: "React",
    })
  })

  it("matches array-valued client preference schemas", () => {
    expect(
      buildFigmaToolArgs(
        {
          inputSchema: {
            type: "object",
            properties: {
              figma_url: { type: "string" },
              clientFrameworks: { type: "array", items: { type: "string" } },
              clientLanguages: { type: "array", items: { type: "string" } },
            },
          },
        },
        "https://www.figma.com/design/abc123/Name?node-id=12-34"
      )
    ).toEqual({
      figma_url: "https://www.figma.com/design/abc123/Name?node-id=12-34",
      clientFrameworks: ["React"],
      clientLanguages: ["TypeScript"],
    })
  })

  it("falls back to url arguments when no schema is provided", () => {
    expect(buildFigmaToolArgs(undefined, "https://www.figma.com/design/abc123/Name")).toEqual({
      url: "https://www.figma.com/design/abc123/Name",
    })
  })

  it("extracts fenced React code from design context text", () => {
    const artifacts = extractFigmaMcpArtifacts({
      designContext: {
        result: {
          content: [
            {
              type: "text",
              text: "Here is code:\n```tsx\nexport default function Card() { return <section>Hi</section> }\n```",
            },
          ],
        },
      },
    })

    expect(artifacts.sourceReact).toContain("export default function Card")
  })

  it("extracts base64 MCP image content as a data URL", () => {
    const artifacts = extractFigmaMcpArtifacts({
      designContext: { result: { content: [{ type: "text", text: "ok" }] } },
      screenshot: {
        result: {
          content: [{ type: "image", data: "abc123", mimeType: "image/png" }],
        },
      },
    })

    expect(artifacts.screenshotSrc).toBe("data:image/png;base64,abc123")
  })

  it("keeps localhost screenshot asset URLs even without file extensions", () => {
    const artifacts = extractFigmaMcpArtifacts({
      designContext: { result: { content: [{ type: "text", text: "ok" }] } },
      screenshot: {
        result: {
          content: [{ type: "image", imageUrl: "http://127.0.0.1:3845/assets/screenshot-1" }],
        },
      },
    })

    expect(artifacts.screenshotSrc).toBe("http://127.0.0.1:3845/assets/screenshot-1")
  })

  it("collects metadata and variables into context text", () => {
    const artifacts = extractFigmaMcpArtifacts({
      designContext: { result: { content: [{ type: "text", text: "design context" }] } },
      metadata: { result: { content: [{ type: "text", text: "metadata" }] } },
      variableDefs: { result: { content: [{ type: "text", text: "variables" }] } },
      codeConnectMap: { result: { content: [{ type: "text", text: "Button.tsx" }] } },
    })

    expect(artifacts.contextText).toContain("design context")
    expect(artifacts.contextText).toContain("metadata")
    expect(artifacts.contextText).toContain("variables")
    expect(artifacts.contextText).toContain("Button.tsx")
  })

  it("escapes context HTML", () => {
    const html = buildFigmaContextHtml("<Title>", "<script>alert(1)</script>")

    expect(html).toContain("&lt;Title&gt;")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).not.toContain("<script>alert(1)</script>")
  })
})
