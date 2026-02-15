/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@opentriiva/protocol", "@opentriiva/pack-schema"],
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    REDIS_URL: process.env.REDIS_URL,
  },
  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@/stores": require("path").resolve(__dirname, "src/stores"),
      "@/lib": require("path").resolve(__dirname, "src/lib"),
      "@/components": require("path").resolve(__dirname, "src/components"),
      "@/data": require("path").resolve(__dirname, "src/data"),
      "@opentriiva/protocol": require("path").resolve(
        __dirname,
        "packages/protocol/src",
      ),
      "@opentriiva/pack-schema": require("path").resolve(
        __dirname,
        "packages/pack-schema/src",
      ),
    };
    return config;
  },
};

module.exports = nextConfig;
