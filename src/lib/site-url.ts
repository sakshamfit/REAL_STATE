/**
 * Canonical origin. Point NEXT_PUBLIC_SITE_URL at the production domain when
 * deploying (e.g. https://www.yourdomain.com); until then absolute links
 * (sitemap, canonical, JSON-LD) fall back to the dev origin.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
