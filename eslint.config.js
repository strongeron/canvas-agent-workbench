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
  "demo-thicket/App.tsx",
  "demo-thicket/TokenSection.tsx",
  "demo-thicket/designTokens.ts",
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
    },
  },
]
