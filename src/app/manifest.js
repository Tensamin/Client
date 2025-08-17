export default function manifest() {
  return {
    name: 'Tensamin',
    short_name: 'Tensamin',
    description: 'Super secure messaging app',
    start_url: '/',
    display: 'standalone',
    background_color: '#1e1e2e',
    theme_color: '#1e1e2e',
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  }
}