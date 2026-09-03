/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Strict Mode double-mounts effects, which duplicates WebGL/GSAP setup
  // work in a scene this heavy. Keep it off for the 3D experience.
  reactStrictMode: false,
  transpilePackages: ['three'],
  /**
   * Sandboxed dev previews are served from a generated *.e2b.app host rather
   * than localhost, so `next dev` treats requests for /_next/* as cross-origin
   * and warns that a future major version will block them. Allowing the
   * preview domain keeps the live preview working across upgrades; it has no
   * effect on production builds.
   */
  allowedDevOrigins: ['*.e2b.app'],
  experimental: {
    optimizePackageImports: ['@react-three/drei'],
  },
}

export default nextConfig
