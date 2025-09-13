import type { ForgeConfig } from "@electron-forge/shared-types";
import fs from "fs/promises";
import path from "path";
import pkg from "./package.json" assert { type: "json" };

const config: ForgeConfig = {
  packagerConfig: {
    name: "Tensamin",
    executableName: "tensamin",
    appCategoryType: "public.app-category.productivity",
    appBundleId: "net.methanium.tensamin",
    appVersion: pkg.version,
    icon: "./public/app/icon",
    asar: true,
    osxSign: {},
  },
  makers: [
    {
      name: "@electron-forge/maker-wix",
      platforms: ["win32"],
      config: {},
    },
    {
      name: "@electron-forge/maker-dmg",
      platforms: ["darwin"],
      config: {},
    },
    {
      name: "@electron-forge/maker-deb",
      platforms: ["linux"],
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32", "linux", "darwin"],
      config: {},
    },
  ],
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      const results = Array.isArray(makeResults) ? makeResults : [makeResults];

      for (const r of results) {
        const artifacts = Array.isArray(r.artifacts) ? r.artifacts : [];
        if (!artifacts.length) continue;

        const platform =
          r.platform === "darwin"
            ? "mac"
            : r.platform === "win32"
              ? "win"
              : r.platform || process.platform;

        const arch = r.arch || process.arch;

        for (const artifact of artifacts) {
          const base = path.basename(artifact);

          const ext = artifact.endsWith(".tar.gz")
            ? ".tar.gz"
            : path.extname(artifact);

          const newName =
            `tensamin-${platform}-${arch}-${pkg.version}${ext}`.toLowerCase();

          const dest = path.join(path.dirname(artifact), newName);

          if (dest === artifact) continue;

          await fs.rename(artifact, dest);
          console.log(`Renamed: ${base} -> ${newName}`);
        }
      }
    },
  },
};

export default config;
