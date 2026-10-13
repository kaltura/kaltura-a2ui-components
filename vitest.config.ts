import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { PENDING } from './test/pending';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Expected stderr from error-path tests floods the worker RPC. A run can end
    // with "Closing rpc while onUserConsoleLog was pending". Failing tests still print.
    silent: 'passed-only',
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    // PENDING entries are written-but-red security tests. Paths are
    // relative to the repo root, like the default excludes.
    // RUN_PENDING=1 runs them, to check a fix.
    exclude: [...configDefaults.exclude, ...(process.env.RUN_PENDING ? [] : PENDING)],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/adapters/**'],
      reporter: ['text-summary', 'lcov', 'json-summary'],
      // Gate = measured baseline minus 2 points, rounded down. Measured after
      // plan item 2.12 (1304 tests): lines 93.06, statements 90.46,
      // functions 88.46, branches 75.5. Raise per phase.
      thresholds: { lines: 91, statements: 88, functions: 86, branches: 73 },
    },
  },
});
