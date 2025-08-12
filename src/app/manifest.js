export default function manifest() {
  return {
    name: 'Tensamin',
    short_name: 'Tensamin',
    description: 'Super secure messaging app',
    start_url: '/',
    display: 'fullscreen',
    background_color: '#101013',
    theme_color: '#101013',
    icons: [
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}