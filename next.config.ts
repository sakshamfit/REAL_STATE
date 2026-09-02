import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The site is previewed through a proxied host (…​.e2b.app). In development
   * Next.js blocks cross-origin requests to its own dev resources by default,
   * which stops /_next/hmr from connecting — the page then loads its HTML and
   * never executes a single chunk, looking like an endless loading screen.
   * Allow the preview host so `npm run dev` works behind the proxy too.
   */
  allowedDevOrigins: ["*.e2b.app", "e2b.app"],
};

export default nextConfig;
