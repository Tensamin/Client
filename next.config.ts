import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "dist/app",
  assetPrefix: process.env.NODE_ENV === "production" ? "/app/" : "/",
  experimental: {
    reactCompiler: true,
    optimizeCss: true,
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
