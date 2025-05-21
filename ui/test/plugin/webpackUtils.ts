import fs from "node:fs";
import path from "node:path";

import { getUserData } from "playwright/lib/transform/compilationCache";
import { resolveHook } from "playwright/lib/transform/transform";
import { debug } from "playwright-core/lib/utilsBundle";

// import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

import type { PlaywrightTestConfig as BasePlaywrightTestConfig } from "playwright/types/test";
import type { FullConfig } from "playwright/types/testReporter";
import type webpack from "webpack";
import type { Configuration as WebpackConfig } from "webpack";

const log = debug("pw:webpack");

export type CtConfig = BasePlaywrightTestConfig["use"] & {
  ctPort?: number;
  ctTemplateDir?: string;
  ctCacheDir?: string;
  ctWebpackConfig?: WebpackConfig | (() => Promise<WebpackConfig>);
};

export type ImportInfo = {
  id: string;
  filename: string;
  importSource: string;
  remoteName: string | undefined;
};
export type ComponentRegistry = Map<string, ImportInfo>;
export type ComponentDirs = {
  configDir: string;
  outDir: string;
  templateDir: string;
};

export async function resolveDirs(configDir: string, config: FullConfig): Promise<ComponentDirs | null> {
  const use = config.projects[0].use as CtConfig;
  const relativeTemplateDir = use.ctTemplateDir || "playwright";
  const templateDir = await fs.promises.realpath(path.join(configDir, relativeTemplateDir)).catch(() => undefined);
  if (!templateDir) return null;

  const outDir = use.ctCacheDir ? path.resolve(configDir, use.ctCacheDir) : path.resolve(templateDir, ".cache");

  return {
    configDir,
    outDir,
    templateDir,
  };
}

export function resolveEndpoint(config: FullConfig) {
  const use = config.projects[0].use as CtConfig;
  const baseURL = new URL(use.baseURL || "http://localhost");
  return {
    https: baseURL.protocol.startsWith("https:"),
    host: baseURL.hostname,
    port: use.ctPort || Number(baseURL.port) || 3100,
  };
}

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

export async function createWebpackConfig(
  dirs: ComponentDirs,
  config: FullConfig,
  frameworkPluginFactory?: () => Promise<webpack.WebpackPluginInstance>
): Promise<WebpackConfig> {
  const endpoint = resolveEndpoint(config);
  const use = config.projects[0].use as CtConfig;

  const baseConfig: WebpackConfig = {
    mode: "development",
    context: dirs.templateDir,
    entry: path.join(dirs.templateDir, "index.js"),
    output: {
      path: dirs.outDir,
      filename: "bundle.js",
      publicPath: "/",
    },
    devtool: "source-map",
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    module: getStandardModuleRules(),
    plugins: [],
    devServer: {
      host: endpoint.host,
      port: endpoint.port,
      https: endpoint.https,
      static: {
        directory: dirs.templateDir,
      },
      hot: true,
    },
  };

  const userConfig =
    typeof use.ctWebpackConfig === "function" ? await use.ctWebpackConfig() : use.ctWebpackConfig || {};

  if (frameworkPluginFactory) {
    baseConfig.plugins!.push(await frameworkPluginFactory());
  }

  return {
    ...baseConfig,
    ...userConfig,
    plugins: [...(baseConfig.plugins || []), ...(userConfig.plugins || [])],
  };
}

export async function populateComponentsFromTests(
  componentRegistry: ComponentRegistry,
  componentsByImportingFile?: Map<string, string[]>
) {
  const importInfos: Map<string, ImportInfo[]> = await getUserData("playwright-ct-core");
  for (const [file, importList] of importInfos) {
    for (const importInfo of importList) {
      componentRegistry.set(importInfo.id, importInfo);
    }
    if (componentsByImportingFile) {
      componentsByImportingFile.set(
        file,
        importList.map((i) => resolveHook(i.filename, i.importSource)).filter(Boolean) as string[]
      );
    }
  }
}

export function transformIndexFile(
  content: string,
  registerSource: string,
  importInfos: Map<string, ImportInfo>
): string {
  const lines = [content, "", registerSource];

  for (const value of importInfos.values()) {
    const importPath = resolveHook(value.filename, value.importSource) || value.importSource;
    lines.push(
      `const ${value.id} = () => import('${importPath?.replaceAll(path.sep, "/")}').then(mod => mod.${
        value.remoteName || "default"
      });`
    );
  }

  lines.push(`__pwRegistry.initialize({ ${[...importInfos.keys()].join(",\n  ")} });`);

  return lines.join("\n");
}

export function frameworkConfig(config: FullConfig): {
  registerSourceFile: string;
  frameworkPluginFactory?: () => Promise<webpack.WebpackPluginInstance>;
} {
  return (config as any)["@playwright/experimental-ct-core"];
}
