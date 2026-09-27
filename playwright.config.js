// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'tests',
  // One browser at a time. With several in parallel (every page drawing its canvas nonstop, in software),
  // about 1 test in 100-200 had a tab stop responding for good: no crash or page error, and even the
  // test's own timeouts didn't fire until the page was closed. One worker ran ~500 tests without it,
  // and isn't slower, because the tests are CPU-bound anyway.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // a phone-sized screen, like the kids who play it
    ...devices['Pixel 7'],
    // 1x pixels: the game draws a canvas every frame, and headless Chromium has no GPU
    deviceScaleFactor: 1,
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: `node tests/server.js ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI
  }
});
