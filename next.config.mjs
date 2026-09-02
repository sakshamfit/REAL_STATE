/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode double-mounts effects, which duplicates WebGL/GSAP setup
  // work in a scene this heavy. Keep it off for the 3D experience.
  reactStrictMode: false,
  transpilePackages: ['three'],
  experimental: {
    optimizePackageImports: ['@react-three/drei'],
  },
}

export default nextConfig
