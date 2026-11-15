import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;
const useProductionServer =
  isCI ||
  process.env.PLAYWRIGHT_USE_PRODUCTION === "1" ||
  process.env.PLAYWRIGHT_USE_PRODUCTION === "true";

const port = Number(process.env.PLAYWRIGHT_PORT || 3000);
const host =
  process.env.PLAYWRIGHT_HOST ||
  (useProductionServer ? "127.0.0.1" : "localhost");
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["json", { outputFile: "playwright-report/test-results.json" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: useProductionServer ? "bun run start" : "bun run dev",
    url: baseURL,
    reuseExistingServer: !isCI && !useProductionServer,
    timeout: 120 * 1000,
    env: useProductionServer
      ? {
          NODE_ENV: "production",
          PORT: String(port),
          HOSTNAME: host,
        }
      : undefined,
  },
});
