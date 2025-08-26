/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    distDir: "dist",
    reactStrictMode: false,
    webpack(config, { dev, isServer }) {
        return config;
    }
};

export default nextConfig;