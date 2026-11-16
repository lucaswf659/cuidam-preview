import { defineConfig, devices } from "@playwright/test";
import "./e2e/config";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3217",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node e2e/start-server.mjs",
    url: "http://127.0.0.1:3217",
    reuseExistingServer: false,
    timeout: 120_000
  }
});

