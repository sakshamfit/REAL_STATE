import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import { company } from '@/data/company'
import { presenceStates } from '@/data/presence'
import { SITE_URL } from '@/lib/site-url'

const DESCRIPTION =
  'Rudra Constructions & Suppliers — construction company in Bihar (Patna, Bettiah) & Assam (Biswanath, Jorhat): civil & structural, residential & commercial, infrastructure, solar & renewable EPC, renovation & retrofit and building materials supplier across India. Founded 2025 · ₹14.65 Cr turnover. Call +91 80995 88978.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'RUDRA CONSTRUCTIONS & SUPPLIERS — Civil Contractors in Bihar & Assam | Building the Future',
  description: DESCRIPTION,
  applicationName: 'Rudra Constructions & Suppliers',
  authors: [{ name: 'RUDRA Constructions & Suppliers' }],
  creator: 'RUDRA Constructions & Suppliers',
  publisher: 'RUDRA Constructions & Suppliers',
  category: 'construction',
  keywords: [
    'Rudra Constructions',
    'Rudra Constructions & Suppliers',
    'construction company Bihar',
    'civil contractors Patna',
    'civil contractor Bettiah',
    'building construction company in Bihar',
    'real estate developer Patna',
    'construction company Assam',
    'contractor Jorhat',
    'contractor Biswanath',
    'infrastructure construction India',
    'road culvert contractor Bihar',
    'solar EPC India',
    'rooftop solar installer Assam',
    'building material supplier Bihar',
    'renovation and retrofit contractor',
    'RCC frame contractor',
    'group housing contractor Bihar',
    'home builder Patna',
    'construction company India',
  ],
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: 'RUDRA CONSTRUCTIONS & SUPPLIERS — Building the Future',
    description:
      'Construction company in Bihar (Patna, Bettiah) & Assam (Biswanath, Jorhat) — civil & structural, residential & commercial, infrastructure, solar & renewable, renovation & building materials. Interactive 3D presence map across India.',
    url: SITE_URL,
    siteName: company.legalName,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'RUDRA CONSTRUCTIONS & SUPPLIERS — Engineering Trust. Constructing Excellence.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RUDRA CONSTRUCTIONS & SUPPLIERS — Building the Future',
    description:
      'Civil & structural contractors in Bihar & Assam. Infrastructure · Solar & renewable · Renovation · Building materials across India. Call +91 80995 88978.',
    images: ['/og.jpg'],
  },
  formatDetection: { telephone: true, email: true, address: false },
  other: {
    'geo.region': 'IN-BR',
    'geo.placename': 'Patna · Bettiah, Bihar, India',
  },
}

export const viewport: Viewport = {
  themeColor: '#060b17',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

function schemaJsonLd(): object[] {
  const origin = SITE_URL
  return [
    {
      '@context': 'https://schema.org',
      '@type': ['Organization', 'ConstructionBusiness'],
      '@id': `${origin}/#organization`,
      name: company.legalName,
      alternateName: company.name,
      legalName: company.legalName,
      slogan: 'Engineering Trust. Constructing Excellence.',
      description:
        'Civil & structural, residential & commercial, infrastructure, solar & renewable, renovation & retrofit construction and building materials supply across India — operating in Bihar (Patna, Bettiah) and Assam (Biswanath, Jorhat).',
      url: origin,
      foundingDate: '2025',
      telephone: company.phone,
      email: company.email,
      priceRange: '₹₹₹',
      address: {
        '@type': 'PostalAddress',
        addressRegion: 'Bihar',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: company.phone,
        email: company.email,
        areaServed: 'IN',
        availableLanguage: ['en', 'hi'],
      },
      areaServed: presenceStates.map((state) => ({ '@type': 'State', name: state.name })),
      knowsAbout: [
        'Civil and structural construction',
        'Residential and commercial construction',
        'Infrastructure — roads, bridges, culverts',
        'Solar and renewable EPC',
        'Renovation and structural retrofit',
        'Building materials supply',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: company.legalName,
      url: origin,
      inLanguage: 'en-IN',
      publisher: { '@id': `${origin}/#organization` },
    },
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = schemaJsonLd()
  return (
    <html lang="en-IN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
