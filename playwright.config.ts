import { defineConfig, devices } from '@playwright/test'

// Gesture e2e harness (FOX2-64). Runs against the vite dev server and the
// `demo` project WITHOUT opening a canvas file, so canvas state stays in
// per-context localStorage and never touches projects/ on disk.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5178',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // A dedicated port + strictPort with a freshly started dev server every run
  // (never reused). A long-running server accumulates HMR state across code
  // edits, which made single gestures apply multiple times; a clean process
  // per run is deterministic and keeps the harness off the developer's :5173.
  webServer: {
    command: 'npm run dev -- --port 5178 --strictPort',
    url: 'http://localhost:5178',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
