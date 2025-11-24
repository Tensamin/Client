import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import type { ForgeConfig } from "@electron-forge/shared-types";

import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerDeb, MakerDebConfig } from "@electron-forge/maker-deb";
import { MakerRpm, MakerRpmConfig } from "@electron-forge/maker-rpm";

import { PublisherGithub } from "@electron-forge/publisher-github";

import packageJson from "../package.json" assert { type: "json" };

const linuxPackageProps = {
  options: {
    name: packageJson.name,
    genericName: "Chat Application",
    version: packageJson.version,
    description: packageJson.description,
    categories: ["Network", "Office", "Utility"],
    maintainer: packageJson.author.name,
    homepage: packageJson.homepage,
    mimeType: ["x-scheme-handler/tensamin"],
    icon: "./assets/icon/icon.png",
  },
} satisfies MakerDebConfig | MakerRpmConfig;

const config: ForgeConfig = {
  packagerConfig: {
    executableName: packageJson.name,
    appVersion: packageJson.version,
    icon: "./assets/icon/icon",
    asar: true,
    ignore: [
      "forge.config.ts",
      "bun.lock",
      "shell.nix",
      "aur",
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: packageJson.name,
      version: packageJson.version,
      authors: packageJson.author.name,
      description: packageJson.description,
      setupExe: `${packageJson.productName} Setup (${packageJson.version}).exe`,
      setupMsi: `${packageJson.productName} Setup (${packageJson.version}).msi`,
      setupIcon: "./assets/installer.ico",
      //loadingGif: "./assets/loading.gif",
      title: packageJson.productName,
      noMsi: true,
    }),
    new MakerDMG({
      name: packageJson.name,
      title: packageJson.productName,
    }),
    new MakerDeb(linuxPackageProps),
    new MakerRpm(linuxPackageProps),
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        name: "Frontend",
        owner: "Tensamin",
      },
      authToken: process.env.GITHUB_TOKEN,
      draft: false,
      prerelease: false,
      tagPrefix: "desktop-v",
      generateReleaseNotes: true,
      force: true,
    }),
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
