import type { NextConfig } from "next";

export default {
  output: "export",
  distDir: "out",
  devIndicators: false,
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
  },
  images: { unoptimized: true },
} as NextConfig;
