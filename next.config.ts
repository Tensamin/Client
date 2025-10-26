import type { NextConfig } from "next";

export default {
  output: "export",
  distDir: "dist",
  reactCompiler: true,
  experimental: {
    optimizeCss: true,
  },
} as NextConfig;
