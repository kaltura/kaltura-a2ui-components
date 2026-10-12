import { defineConfig, devices } from '@playwright/test';
import { ORIGIN_A, PORT_A, PORT_B } from './e2e/fixtures/constants';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  // Cases titled '[pending ...]' wait for their fix. Run them with E2E_PENDING=1.
  grepInvert: process.env.E2E_PENDING ? undefined : /\[pending/,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: ORIGIN_A, trace: 'on-first-retry' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    // Builds dist/ first only when it is missing.
    command: 'node e2e/fixtures/servers.mjs',
    url: `${ORIGIN_A}/__health`,
    env: { E2E_PORT_A: String(PORT_A), E2E_PORT_B: String(PORT_B) },
    reuseExistingServer: !isCI,
    timeout: 180_000,
  },
});
