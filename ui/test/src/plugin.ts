// playwright-webpack-plugin.js

import fs from "fs";
import path from "path";
import webpack from "webpack";
import WebpackDevServer from "webpack-dev-server";
import HtmlWebpackPlugin from "html-webpack-plugin";
import { removeDirAndLogToConsole } from "playwright/lib/util";
import { debug } from "playwright-core/lib/utilsBundle";
import { getPlaywrightVersion } from "playwright-core/lib/utils";
import { isURLAvailable } from "playwright-core/lib/utils";

import {
  frameworkConfig,
  resolveDirs,
  resolveEndpoint,
  populateComponentsFromTests,
  hasJSComponents,
  ImportInfo,
  transformIndexFile,
} from "./plugin/webpackUtils";

function getStandardModuleRules() {
  return {
    rules: [
      {
        test: /(maplibre|mapbox|@material|gridstack|@mdi).*\.css$/, //output css as strings
        type: "asset/source",
      },
      {
        test: /\.css$/, //
        exclude: /(maplibre|mapbox|@material|gridstack|@mdi).*\.css$/,
        use: [{ loader: "css-loader" }],
      },
      {
        test: /\.(png|jpg|ico|gif|svg|eot|ttf|woff|woff2|mp4)$/,
        type: "asset",
        generator: {
          filename: "images/[hash][ext][query]",
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: {
          loader: "ts-loader",
          options: {
            projectReferences: true,
          },
        },
      },
    ],
  };
}

import type { TestRunnerPlugin } from "playwright/lib/plugins";
import type { FullConfig, Suite } from "playwright/types/testReporter";

const log = debug("pw:webpack");
const playwrightVersion = getPlaywrightVersion();

let devServer: WebpackDevServer;

export function createPlugin(): TestRunnerPlugin {
  let config: FullConfig;
  let configDir: string;

  return {
    name: "playwright-webpack-plugin",

    setup: async (cfg, cfgDir) => {
      config = cfg;
      configDir = cfgDir;
    },

    begin: async () => {
      const result = await buildBundle(config, configDir);
      if (!result) return;

      const { webpackConfig } = result;
      console.log(webpackConfig);
      devServer = new WebpackDevServer(webpackConfig.devServer, webpack(webpackConfig));
      await devServer.start();

      const address = devServer.server.address();
      if (typeof address === "object") {
        const protocol = webpackConfig.devServer.https ? "https:" : "http:";
        process.env.PLAYWRIGHT_TEST_BASE_URL = `${protocol}//${address.address}:${address.port}`;
      }
    },

    end: async () => {
      setTimeout(async () => {
        if (devServer) await devServer.stop();
      }, 10000);
    },

    populateDependencies: async () => {
      await buildBundle(config, configDir);
    },

    clearCache: async () => {
      const dirs = await resolveDirs(configDir, config);
      if (dirs) await removeDirAndLogToConsole(dirs.outDir);
    },

    startDevServer: async () => {
      // For debugging via playwright directly
      return devServer;
    },
  };
}

async function buildBundle(config: FullConfig, configDir: string): Promise<{ webpackConfig: any } | null> {
  const { registerSourceFile } = frameworkConfig(config);
  const endpoint = resolveEndpoint(config);

  const protocol = endpoint.https ? "https:" : "http:";
  const url = new URL(`${protocol}//${endpoint.host}:${endpoint.port}`);
  if (await isURLAvailable(url, true)) {
    console.log(`Dev Server already running at ${url.toString()}`);
    process.env.PLAYWRIGHT_TEST_BASE_URL = url.toString();
    return null;
  }

  const dirs = await resolveDirs(configDir, config);
  if (!dirs) {
    console.log(`Template file playwright/index.html is missing.`);
    return null;
  }
  console.log("DIRS", dirs);

  const componentRegistry: Map<string, ImportInfo> = new Map();
  const componentsByImportingFile = new Map<string, string[]>();
  await populateComponentsFromTests(componentRegistry, componentsByImportingFile);

  const registerSource = fs.readFileSync(registerSourceFile, "utf-8");
  const jsxInJS = hasJSComponents([...componentRegistry.values()]);

  console.log("DIRS", componentsByImportingFile);
  console.log("Component Registry", componentRegistry);

  const indexSourcePath = path.join(dirs.templateDir, "index.js");
  const transformedIndex = transformIndexFile(
    indexSourcePath,
    fs.readFileSync(indexSourcePath, "utf-8"),
    dirs.templateDir,
    registerSource,
    componentRegistry
  );

  const outputIndexPath = path.join(dirs.outDir, "virtual-index.js");
  fs.writeFileSync(outputIndexPath, transformedIndex?.code);

  const webpackConfig = {
    mode: "development",
    entry: outputIndexPath,
    output: {
      path: dirs.outDir,
      filename: "bundle.js",
    },
    devtool: "source-map",
    devServer: {
      static: {
        directory: dirs.templateDir,
      },
      host: endpoint.host,
      port: endpoint.port,
      https: !!endpoint.https,
    },
    module: {
      ...getStandardModuleRules(),
      // rules: [
      //   {
      //     test: jsxInJS ? /\.jsx?$/ : /\.tsx?$/,
      //     use: {
      //       loader: "babel-loader",
      //       options: {
      //         presets: ["@babel/preset-react", "@babel/preset-env"],
      //       },
      //     },
      //     exclude: /node_modules/,
      //   },
      // ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __REGISTER_SOURCE__: JSON.stringify(registerSource),
        __COMPONENTS__: JSON.stringify([...componentRegistry.values()]),
      }),
      new HtmlWebpackPlugin({
        inject: "body",
        scriptLoading: "module",
      }),
      // new HtmlWebpackPlugin({
      //   template: path.join(dirs.templateDir, "index.html"),
      //   inject: "body", // ensures <script> is added before </body>
      // }),
      // new HtmlWebpackPlugin({
      //   template: path.join(dirs.templateDir, "index.html"),
      //   inject: "body",
      //   scriptLoading: "module",
      //   templateParameters: {
      //     registerSource,
      //   },
      // }),
    ],
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
  };
  // console.log("config", webpackConfig);

  return { webpackConfig };
}
