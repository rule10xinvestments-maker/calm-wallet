import { defineConfig, devices } from "@playwright/test";

const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? `playwright-results/run-${process.pid}`;

export default defineConfig({
  testDir: "./src/tests/e2e",
  fullyParallel: true,
  outputDir,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/sign-in",
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.E2E_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.E2E_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "test-anon-key",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
    },
    reuseExistingServer: !process.env.CI,
  },
});
