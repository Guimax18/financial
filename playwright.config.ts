import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: './tests/browser', fullyParallel: false, workers: 1, timeout: 30000,
 use: { baseURL: 'http://127.0.0.1:3111', browserName: 'chromium', trace: 'retain-on-failure' },
 webServer: [
  { command: 'node tests/support/supabase-stub.mjs', port: 54329, reuseExistingServer: false },
  { command: 'npm run dev -- --port 3111', url: 'http://127.0.0.1:3111/login', timeout: 120000,
    env: { NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54329', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-local-test-key' } },
 ],
});
