/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  webpack: (config) => {
    // three ships ESM; ensure it is treated consistently
    config.resolve.alias = {
      ...config.resolve.alias,
      three: "three",
    };
    return config;
  },
};

export default nextConfig;
