import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

export const adminStatePath = path.join(import.meta.dirname, "e2e", ".auth", "admin.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8089",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "smoke", testMatch: /smoke\.spec\.ts/ },
    { name: "setup", testMatch: /auth\.setup\.ts/, dependencies: ["smoke"] },
    {
      name: "chromium",
      testIgnore: [/smoke\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ["setup"],
      use: { storageState: adminStatePath },
    },
  ],
});
