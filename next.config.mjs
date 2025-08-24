/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "export",
    distDir: "dist",
    webpack(config, { dev, isServer }) {
        return config;
    }
};

export default nextConfig;