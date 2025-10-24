import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

export default {
  output: "export",
  distDir: "dist",
  assetPrefix: isProd ? undefined : `http://${internalHost}:3000`,
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
  },
} as NextConfig;
