/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@opentriiva/protocol', '@opentriiva/pack-schema'],
};

module.exports = nextConfig;
