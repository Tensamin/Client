module.exports = {
  packagerConfig: {
    name: 'tensamin',
    asar: true,
    ignore: [
      /\.git/,
      /\.next/,
      /out/,
    ]
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
      }
    },
    {
      name: '@electron-forge/maker-zip'
    },
    {
      name: '@electron-forge/maker-appx'
    }
  ],
};