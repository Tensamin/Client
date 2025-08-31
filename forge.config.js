let path = require('node:path');
let fs = require('node:fs/promises');
let pkg = require('./package.json');

let { FusesPlugin } = require('@electron-forge/plugin-fuses');
let { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    name: 'Tensamin',
    asar: true,
    appCategoryType: 'public.app-category.social-networking',
    icon: 'public/icon/icon',
    executableName: 'tensamin',
  },
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-zip' },
    {
      name: '@electron-forge/maker-wix',
      config: {
        language: 1033,
        manufacturer: 'Methanium',
        icon: 'public/icon/icon.png'
      }
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        background: 'public/preview1.png',
        format: 'ULFO'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          icon: 'public/icon/icon.png',
        },
      },
    },
    {
      name: '@electron-forge/maker-flatpak',
      config: {
        options: {
          categories: ['Audio', 'Video', 'Network', 'Office', 'Utility'],
          mimeType: ['video/h264']
        }
      }
    }
  ],
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      let results = Array.isArray(makeResults)
        ? makeResults
        : [makeResults];

      for (let r of results) {
        let artifacts = Array.isArray(r.artifacts) ? r.artifacts : [];
        if (!artifacts.length) continue;

        let platform =
          r.platform === 'darwin'
            ? 'mac'
            : r.platform === 'win32'
              ? 'win'
              : r.platform || process.platform;

        let arch = r.arch || process.arch;

        for (let artifact of artifacts) {
          let base = path.basename(artifact);

          let ext = artifact.endsWith('.tar.gz')
            ? '.tar.gz'
            : path.extname(artifact);

          let newName = (
            `tensamin-${platform}-${arch}-${pkg.version}${ext}`
          ).toLowerCase();

          let dest = path.join(path.dirname(artifact), newName);

          if (dest === artifact) continue;

          await fs.rename(artifact, dest);
          console.log(`Renamed: ${base} -> ${newName}`);
        }
      }
    },
  },
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
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