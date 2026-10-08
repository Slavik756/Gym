import { defineConfig } from "@playwright/test";

const previewURL = "http://127.0.0.1:4174";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: previewURL,
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
    locale: "en-US",
    timezoneId: "Europe/Paris",
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4174 --strictPort",
    url: previewURL,
    reuseExistingServer: false,
  },
});
