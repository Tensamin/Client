import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist/app",
  assetPrefix: "./",
  experimental: {
    reactCompiler: true,
    optimizeCss: true,
  },
};

export default nextConfig;
