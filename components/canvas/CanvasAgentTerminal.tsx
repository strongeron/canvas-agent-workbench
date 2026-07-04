import { useEffect, useMemo, useRef } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import "@xterm/xterm/css/xterm.css"

interface CanvasAgentTerminalProps {
  sessionId?: string
  output: string
  /**
   * Raw chunk stream from the bridge. When provided, chunks append straight
   * to xterm and `output` is only used to seed a freshly opened/switched
   * session — the accumulated string is trimmed to 200KB upstream, which
   * breaks prefix-diffing once exceeded (FOX2-51: reset+rewrite per chunk).
   */
  outputEvents?: EventTarget
  running: boolean
  onInput: (input: string) => void
  onResize: (size: { cols: number; rows: number }) => void
}

export function CanvasAgentTerminal({
  sessionId,
  output,
  outputEvents,
  running,
  onInput,
  onResize,
}: CanvasAgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const lastOutputRef = useRef("")
  const lastSessionIdRef = useRef<string | undefined>(undefined)
  const onInputRef = useRef(onInput)
  const onResizeRef = useRef(onResize)
  const runningRef = useRef(running)
  const sessionIdRef = useRef(sessionId)

  onInputRef.current = onInput
  onResizeRef.current = onResize
  runningRef.current = running
  sessionIdRef.current = sessionId

  const terminalTheme = useMemo(
    () => ({
      background: "#0b1120",
      foreground: "#f8fafc",
      cursor: "#f8fafc",
      black: "#0f172a",
      brightBlack: "#475569",
      red: "#f87171",
      brightRed: "#fca5a5",
      green: "#4ade80",
      brightGreen: "#86efac",
      yellow: "#facc15",
      brightYellow: "#fde68a",
      blue: "#60a5fa",
      brightBlue: "#93c5fd",
      magenta: "#c084fc",
      brightMagenta: "#d8b4fe",
      cyan: "#22d3ee",
      brightCyan: "#67e8f9",
      white: "#e2e8f0",
      brightWhite: "#ffffff",
    }),
    []
  )

  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const terminal = new Terminal({
      convertEol: false,
      cursorBlink: true,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
      fontSize: 12,
      lineHeight: 1.25,
      scrollback: 5000,
      theme: terminalTheme,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()
    terminal.focus()

    const dataDisposable = terminal.onData((data) => {
      if (!runningRef.current || !sessionIdRef.current) return
      onInputRef.current(data)
    })

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      const dimensions = fitAddon.proposeDimensions()
      if (!dimensions || !sessionIdRef.current) return
      onResizeRef.current({
        cols: dimensions.cols,
        rows: dimensions.rows,
      })
    })
    resizeObserver.observe(containerRef.current)

    terminalRef.current = terminal
    return () => {
      resizeObserver.disconnect()
      dataDisposable.dispose()
      terminal.dispose()
      fitAddon.dispose()
      terminalRef.current = null
      lastOutputRef.current = ""
    }
  }, [terminalTheme])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return
    terminal.options.disableStdin = !running
  }, [running])

  useEffect(() => {
    if (!outputEvents) return
    const handleChunk = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionId?: string; chunk?: string }>).detail
      if (!detail?.sessionId || detail.sessionId !== sessionIdRef.current) return
      if (typeof detail.chunk !== "string" || !detail.chunk) return
      terminalRef.current?.write(detail.chunk)
    }
    outputEvents.addEventListener("session-output", handleChunk)
    return () => outputEvents.removeEventListener("session-output", handleChunk)
  }, [outputEvents])

  useEffect(() => {
    const terminal = terminalRef.current
    if (!terminal) return

    if (lastSessionIdRef.current !== sessionId) {
      terminal.reset()
      lastOutputRef.current = ""
      lastSessionIdRef.current = sessionId

      if (outputEvents) {
        // Seed once from the accumulated buffer; when it has been trimmed the
        // head can start mid-escape-sequence, so cut to the first newline to
        // keep xterm from painting a broken tail as literal text.
        const seed =
          output.length >= 200_000 && output.includes("\n")
            ? output.slice(output.indexOf("\n") + 1)
            : output
        if (seed) terminal.write(seed)
        lastOutputRef.current = output
        return
      }
    }

    // Chunk mode: everything after the seed arrives via outputEvents.
    if (outputEvents) return

    if (!output) return

    if (output.startsWith(lastOutputRef.current)) {
      const delta = output.slice(lastOutputRef.current.length)
      if (delta) {
        terminal.write(delta)
        lastOutputRef.current = output
      }
      return
    }

    terminal.reset()
    terminal.write(output)
    lastOutputRef.current = output
  }, [output, outputEvents, sessionId])

  return (
    <div className="relative h-full min-h-[260px] rounded-lg border border-default bg-slate-950">
      <div ref={containerRef} className="h-full w-full px-2 py-2" />
      {!sessionId && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-300">
          Select or create a session to open the terminal.
        </div>
      )}
    </div>
  )
}
