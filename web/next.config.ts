import type { NextConfig } from "next";

export default {
  output: "export",
  distDir: "out",
  devIndicators: false,
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
  },
} as NextConfig;
