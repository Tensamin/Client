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
    theme_color: "#e5e5e5",
    icons: [
      {
        src: "/assets/app/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/app/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
