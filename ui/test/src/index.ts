import path from "node:path";
import { defineConfig as originalDefineConfig, PlaywrightTestConfig } from "@playwright/test";
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
    },
    "@playwright/experimental-ct-core": {
      registerSourceFile: path.join(__dirname, "registerSource.mjs"),
    },
  };
}

export { test, expect, devices, defineConfig };
