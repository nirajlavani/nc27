import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: { ...devices["Desktop Chrome"], channel: "chrome", baseURL: "http://localhost:3456" },
  webServer: {
    command: "npm run dev -- --port 3456",
    url: "http://localhost:3456",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
