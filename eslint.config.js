import js from "@eslint/js"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import tseslint from "@typescript-eslint/eslint-plugin"
import globals from "globals"
import tsParser from "@typescript-eslint/parser"

const LINT_TARGETS = [
  "components/**/*.{ts,tsx}",
  "hooks/**/*.{ts,tsx}",
  "types/**/*.{ts,tsx}",
  "utils/**/*.{ts,tsx}",
  "demo/App.tsx",
  "demo/components/**/*.{ts,tsx}",
]

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "examples/**",
      "projects/**",
      "scripts/**",
      "**/_archive/**",
      "demo-thicket/platform/**",
      "demo-thicket/configs/**",
      "demo-thicket/registry/**",
      "demo-thicket/shims/**",
      "demo-thicket/renderers/**",
      "demo-thicket/previews/**",
      "demo-thicket/data/**",
      "demo-thicket/hooks/**",
      "demo-thicket/types/**",
    ],
  },
  {
    files: LINT_TARGETS,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@typescript-eslint": tseslint,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      // Client-import guard. A shared/client module that imports a Node
      // builtin compiles, type-checks, and passes Vitest (all run in Node) —
      // but Vite externalizes the builtin in the browser bundle and the app
      // crashes to a blank screen at runtime. This happened: canvasAstPath
      // imported `node:crypto` and blanked the canvas. This rule fails the
      // existing lint / pre-commit gate at commit time instead.
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["node:*"],
          message:
            "Node builtins must not be imported by client/shared source — Vite externalizes them and the app blanks at runtime (tsc/Vitest pass because they run in Node). If this module is genuinely server/build-only and never reachable from the client bundle, add it to the server-only allowlist override in eslint.config.js with a comment.",
        }],
        paths: [
          { name: "crypto", message: "Bare 'crypto' is Node-only and Vite externalizes it — use a browser-safe hash (see canvasAstPath FNV-1a)." },
          { name: "fs", message: "fs is server-only; client/shared code must not import it." },
          { name: "child_process", message: "child_process is server-only." },
          { name: "worker_threads", message: "worker_threads is server-only." },
        ],
      }],
    },
  },
  {
    // Server/build-only modules: imported by vite.config, API endpoints, or
    // bin — never reachable from the client React bundle, so Node builtins
    // are legitimate here. INVARIANT: nothing in this list may be imported
    // by client code (components/**, hooks/**, or a util the client tree
    // pulls in). Adding a file here is a conscious "this is server-only"
    // assertion, not a way to silence the guard.
    files: [
      "utils/agentNativeBrowser.ts",
      "utils/agentNativeRuntimeAdapters.ts",
      "utils/agentNativeRuntimeSessions.ts",
      "utils/canvasFileAssets.ts",
      "utils/canvasFileStore.ts",
      "utils/canvasTokenCss.ts",
      "utils/copilotkitViteAdapter.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]
