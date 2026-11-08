// Live tests against a real Kaltura account: `npm run e2e:live`. Never run in CI (no secrets there).
// No trace, video or screenshot: they would record the KS in request headers.
import { defineConfig, devices } from '@playwright/test';
import { ORIGIN_A, PORT_A, PORT_B } from './e2e/fixtures/constants';

// Node's --env-file does not expand references. Let `ALT_X=$OTHER_KEY` in .env point at another key.
for (const [key, value] of Object.entries(process.env)) {
  const ref = value?.match(/^\$([A-Z][A-Z0-9_]*)$/)?.[1];
  if (ref && process.env[ref] !== undefined) process.env[key] = process.env[ref];
}

export default defineConfig({
  testDir: 'e2e/live',
  workers: 1,
  timeout: 90_000,
  reporter: [['list']],
  use: { baseURL: ORIGIN_A, trace: 'off', video: 'off', screenshot: 'off' },
  projects: [
    {
      name: 'chromium',
      // A fake camera and microphone, so the Recorder can open.
      use: {
        ...devices['Desktop Chrome'],
        permissions: ['camera', 'microphone'],
        launchOptions: { args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] },
      },
    },
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
