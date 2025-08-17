module.exports = {
  packagerConfig: {
    name: "tensamin",
    asar: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'Methanium',
          homepage: 'https://methanium.net'
        },
        icon: './public/web-app-manifest-512x512.png'
      }
    },
    {
      name: '@electron-forge/maker-zip'
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        iconUrl: 'https://tensamin.methanium.net/windows-256x256.ico',
        setupIcon: './src/app/favicon.ico'
      }
    }
  ]
};