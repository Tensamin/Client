import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist/app",
  assetPrefix: "./",
  experimental: {
    reactCompiler: true,
    optimizeCss: true,
  },

  webpack: (config) => {
    config.module.rules.push({
      test: /\.worker\.ts$/,
      loader: "worker-loader",
      options: { filename: "[name].js" },
    });
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  org: "tensamin",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
});
