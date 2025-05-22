import { defineConfig as originalDefineConfig } from "@playwright/test";

import { test, expect, devices } from "@playwright/experimental-ct-core";
import { createPlugin } from "./plugin";

export const setupProjects = [
  {
    name: "setup",
    testMatch: "**/*.setup.ts",
    teardown: "cleanup",
    worker: 1,
  },
  {
    name: "cleanup",
    testMatch: "**/*.cleanup.ts",
    worker: 1,
  },
];

export * from "./fixtures/page";

function defineConfig(...configs) {
  const original = originalDefineConfig(...configs);
  return {
    ...original,
    "@playwright/test": {
      ...original["@playwright/test"],
      // Playwright Webpack plugin
      plugins: [createPlugin],
      // Required for Playwright UI to understand the test source code
      babelPlugins: [[require.resolve("./plugin/transform")]],
    },
    "@playwright/experimental-ct-core": {
      // Used to attach components to the document
      registerSourceFile: require.resolve("./plugin/registerSource"),
    },
  };
}

export { test, expect, devices, defineConfig };
