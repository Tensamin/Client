module.exports = {
  packagerConfig: {
    name: 'tensamin',
    asar: true,
    ignore: [
      /\.git/,
      /\.next/,
      /out/,
    ],
  },
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Methanium',
          homepage: 'https://methanium.net',
        },
        icon: './public/web-app-manifest-512x512.png',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      // explicitly include win32 so zip is available as a make target on Windows
      platforms: ['win32', 'linux'],
    },
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        iconUrl: 'https://tensamin.methanium.net/windows-256x256.ico',
        setupIcon: './src/app/favicon.ico',
      },
    },
    {
      // add the WiX maker as an additional Windows target (MSI)
      name: '@electron-forge/maker-wix',
      platforms: ['win32'],
    },
  ],
};