import { defineConfig, devices, setupProjects } from "@openremote/test";
const { CI } = process.env;

const browsers = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  // {
  //   name: "firefox",
  //   use: { ...devices["Desktop Firefox"] },
  // },
  // {
  //   name: "webkit",
  //   use: { ...devices["Desktop Safari"] },
  // },
];

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testMatch: "*.test.ts",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: Boolean(CI),
  /* Retry on CI only */
  retries: CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["html"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: process.env.managerUrl || "localhost:9000/",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "retain-on-failure",
    video: "on",
  },
  /* Configure projects */
  projects: [
    {
      name: "components",
      use: { ...devices["Desktop Chrome"] },
      testDir: "component",
      fullyParallel: true,
    },
    ...setupProjects,
    {
      name: "manager",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
      testDir: "app/manager/test",
      fullyParallel: false,
      workers: 1,
    },
  ],
});
