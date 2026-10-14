// Live tests against a real Kaltura account: `npm run e2e:live`. Never run in CI (no secrets there).
// No trace, video or screenshot: they would record the KS in request headers.
import { defineConfig, devices } from '@playwright/test';
import { ORIGIN_A, PORT_A, PORT_B } from './e2e/fixtures/constants';

export default defineConfig({
  testDir: 'e2e/live',
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: ORIGIN_A, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'node e2e/fixtures/servers.mjs',
    url: `${ORIGIN_A}/__health`,
    env: { E2E_PORT_A: String(PORT_A), E2E_PORT_B: String(PORT_B) },
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
