/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    distDir: "dist/docs",
    reactStrictMode: false,
    webpack(config, { dev, isServer }) {
        return config;
    }
};

export default nextConfig;