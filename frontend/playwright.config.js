import { defineConfig } from '@playwright/test';

const env = globalThis.process?.env ?? {};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: env.E2E_BASE_URL || 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  }
});
