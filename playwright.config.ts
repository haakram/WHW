import { defineConfig } from "@playwright/test";

const appUrl = process.env["APP_URL"] ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: appUrl,
    viewport: { width: 1440, height: 900 },
    screenshot: "only-on-failure",
  },
  ...(process.env["APP_URL"]
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }),
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
      },
    },
  ],
});
