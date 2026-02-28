import fs from "node:fs"
import path from "node:path"

const themePath = path.resolve("demo-thicket/theme.css")
const themeCss = fs.existsSync(themePath)
  ? fs.readFileSync(themePath, "utf8")
  : ""

const colors = {}
const borderColor = {}
const boxShadow = {}

for (const match of themeCss.matchAll(/--color-([a-z0-9-]+)\s*:\s*[^;]+;/gi)) {
  const name = match[1]
  const value = `var(--color-${name})`
  const shade = name.match(/^(.*)-(\\d{2,3})$/)
  if (shade) {
    const base = shade[1]
    const step = shade[2]
    if (!colors[base] || typeof colors[base] !== "object") {
      colors[base] = {}
    }
    colors[base][step] = value
  } else if (colors[name] && typeof colors[name] === "object") {
    colors[name].DEFAULT = value
  } else {
    colors[name] = value
  }

  if (name.startsWith("border-")) {
    const borderKey = name.replace(/^border-/, "")
    borderColor[borderKey] = value
  }
}

for (const match of themeCss.matchAll(/--shadow-([a-z0-9-]+)\s*:\s*[^;]+;/gi)) {
  const name = match[1]
  boxShadow[name] = `var(--shadow-${name})`
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./demo/**/*.{ts,tsx}",
    "./demo-thicket/**/*.{ts,tsx}",
    "./components/{_reference,agent,canvas,color-canvas,color-picker}/**/*.{ts,tsx}",
    "./components/oklch-picker-portable/src/**/*.{ts,tsx}",
    "./core/**/*.{ts,tsx}",
    "./projects/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors,
      borderColor,
      boxShadow,
    },
  },
  plugins: [],
}
