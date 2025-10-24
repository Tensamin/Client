import type { NextConfig } from "next";

export default {
  output: "export",
  distDir: "dist/app",
  assetPrefix: process.env.NODE_ENV === "production" ? "/app/" : "/",
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
  },
} as NextConfig;
