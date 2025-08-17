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
        }
      }
    },
    {
      name: '@electron-forge/maker-zip'
    },
    {
      name: '@electron-forge/maker-squirrel'
    }
  ]
};