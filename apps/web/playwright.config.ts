import { defineConfig, devices } from "@playwright/test";

/** Browser tests of the critical journeys against the real app in offline mode (frozen synthetic cohort, no
 *  secrets, no network). CI generates the snapshot, builds, and starts the server before running these.
 *  Locally: `npm run build`, then `npm run e2e` (starts the server itself). Set E2E_CHANNEL=chrome to use an
 *  installed Chrome instead of the bundled Chromium. */
const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...(process.env.E2E_CHANNEL ? { channel: process.env.E2E_CHANNEL } : {}),
  },
  projects: [{ name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npx cross-env ASCORA_OFFLINE=1 next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health?probe=live`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
