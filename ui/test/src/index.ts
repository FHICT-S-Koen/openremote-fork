import path from "node:path";
import { FullConfig, defineConfig as originalDefineConfig, PlaywrightTestConfig } from "@playwright/test";
import { test, expect, devices } from "@playwright/experimental-ct-core";
import { createPlugin } from "./plugin";

export { BasePage } from "./fixtures/page";

function defineConfig(...configs: PlaywrightTestConfig[]) {
  const original = originalDefineConfig(...configs);
  return {
    ...original,
    "@playwright/test": {
      ...original["@playwright/test"],
      plugins: [() => createPlugin()],
      babelPlugins: [[require.resolve("./plugin/transform")]],
    },
    "@playwright/experimental-ct-core": {
      registerSourceFile: path.join(__dirname, "plugin/registerSource.mjs"),
    },
  };
}

export { test, expect, devices, defineConfig };
