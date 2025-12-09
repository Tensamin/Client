import type { MetadataRoute } from "next";
import packageJson from "../../package.json";

export const dynamic = "force-static";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: packageJson.productName,
    short_name: packageJson.productName,
    description: packageJson.description,
    start_url: "/",
    display_override: ["window-controls-overlay"],
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/assets/app/icon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-72x72.png",
        sizes: "72x72",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-128x128.png",
        sizes: "128x128",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-144x144.png",
        sizes: "144x144",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-152x152.png",
        sizes: "152x152",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-256x256.png",
        sizes: "256x256",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-384x384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/assets/app/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
