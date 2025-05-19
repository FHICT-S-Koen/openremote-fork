import fs from "node:fs";
import path from "node:path";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";

import { Watcher } from "playwright/lib/fsWatcher";

import { source as injectedSource } from "./generated/indexSource";
import {
  createWebpackConfig,
  frameworkConfig,
  populateComponentsFromTests,
  resolveDirs,
  transformIndexFile,
  ComponentRegistry,
} from "./webpackUtils"; // you'll adapt your viteUtils for Webpack

import type { FullConfig } from "playwright/test";

export async function runDevServer(config: FullConfig): Promise<() => Promise<void>> {
  const { registerSourceFile, frameworkPluginFactory } = frameworkConfig(config);
  const componentRegistry: ComponentRegistry = new Map();
  await populateComponentsFromTests(componentRegistry);

  const configDir = config.configFile ? path.dirname(config.configFile) : config.rootDir;
  const dirs = await resolveDirs(configDir, config);
  if (!dirs) {
    console.log(`Template file playwright/index.html is missing.`);
    return async () => {};
  }

  const registerSource = injectedSource + "\n" + (await fs.promises.readFile(registerSourceFile, "utf-8"));
  const webpackConfig = await createWebpackConfig(dirs, config, frameworkPluginFactory);

  // Custom plugin to transform index.html
  webpackConfig.plugins!.push(
    new webpack.DefinePlugin({
      __INJECTED_REGISTER_SOURCE__: JSON.stringify(registerSource),
    })
  );

  webpackConfig.plugins!.push({
    apply(compiler) {
      compiler.hooks.emit.tapAsync("TransformIndexPlugin", async (compilation, callback) => {
        const indexPath = path.join(dirs.templateDir, "index.html");
        const raw = await fs.promises.readFile(indexPath, "utf-8");
        const transformed = await transformIndexFile(
          indexPath,
          raw,
          dirs.templateDir,
          registerSource,
          componentRegistry
        );
        compilation.assets["index.html"] = {
          source: () => transformed,
          size: () => transformed.length,
        };
        callback();
      });
    },
  });

  const compiler = webpack(webpackConfig);

  const devServer = new WebpackDevServer(
    {
      static: {
        directory: dirs.templateDir,
      },
      hot: true,
      open: false,
      host: "localhost",
      port: webpackConfig.devServer?.port || 3000,
      setupMiddlewares: (middlewares, devServer) => {
        if (!devServer) throw new Error("webpack-dev-server not available");
        return middlewares;
      },
    },
    compiler
  );

  await devServer.start();
  const protocol = devServer.options.https ? "https:" : "http:";
  console.log(`Dev Server listening on ${protocol}//localhost:${devServer.options.port}`);

  // Watcher for test/component updates
  const projectDirs = new Set<string>();
  const projectOutputs = new Set<string>();
  for (const p of config.projects) {
    projectDirs.add(p.testDir);
    projectOutputs.add(p.outputDir);
  }

  const globalWatcher = new Watcher(async () => {
    const registry: ComponentRegistry = new Map();
    await populateComponentsFromTests(registry);

    if (componentRegistry.size === registry.size && [...componentRegistry.keys()].every((k) => registry.has(k))) {
      return;
    }

    console.log("List of components changed");
    componentRegistry.clear();
    for (const [k, v] of registry) {
      componentRegistry.set(k, v);
    }

    devServer.sendMessage(devServer.webSocketServer!.clients, "content-changed");
  });

  await globalWatcher.update([...projectDirs], [...projectOutputs], false);

  return () => Promise.all([devServer.stop(), globalWatcher.close()]).then(() => {});
}
