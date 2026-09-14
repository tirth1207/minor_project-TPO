import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  workers: 1,
  reporter: [
    ["html"],
    ["list"]
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 5000,
    navigationTimeout: 20000,
    // Student test accounts credentials
    testIdAttribute: "data-testid"
  },
  projects: [
    {
      name: "Chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
})