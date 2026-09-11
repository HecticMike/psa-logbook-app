import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/pwa',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175/psa-logbook-app/',
    channel: process.env.CI ? undefined : 'msedge',
    viewport: { width: 390, height: 844 }
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175/psa-logbook-app/',
    reuseExistingServer: !process.env.CI
  }
});
