import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import type { ForgeConfig } from "@electron-forge/shared-types";

import packageJson from "../package.json" assert { type: "json" };

const config: ForgeConfig = {
  packagerConfig: {
    executableName: packageJson.name,
    asar: true,
    appVersion: packageJson.version,
    ignore: ["forge.config.ts", "bun.lock", "patch.nix", "aur"],
  },
  rebuildConfig: {},
  makers: [
    {
      platforms: ["darwin", "linux", "win32"],
      name: "@electron-forge/maker-zip",
      config: {},
    },
    {
      platforms: ["darwin"],
      name: "@electron-forge/maker-dmg",
      config: {},
    },
    {
      platforms: ["win32"],
      name: "@electron-forge/maker-wix",
      config: {
        language: 1033,
        manufacturer: packageJson.author.name,
      },
    },
    {
      platforms: ["linux"],
      name: "@electron-forge/maker-deb",
      config: {
        options: {
          maintainer: packageJson.author.name,
          homepage: packageJson.homepage,
        },
      },
    },
    {
      platforms: ["linux"],
      name: "@electron-forge/maker-rpm",
      config: {
        options: {
          homepage: packageJson.homepage,
        },
      },
    },
  ],
  plugins: [
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
