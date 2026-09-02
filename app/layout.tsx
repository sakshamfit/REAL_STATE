import type { Metadata, Viewport } from 'next'
import './globals.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-500.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/inter/latin-300.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'

export const metadata: Metadata = {
  title: 'RUDRA CONSTRUCTIONS & SUPPLIERS — Building the Future',
  description:
    'Rudra Constructions & Suppliers — civil & structural, residential & commercial, infrastructure, solar & renewable, renovation & retrofits and building materials. A cinematic 3D experience with an interactive presence map of India.',
  keywords: [
    'Rudra Constructions',
    'Rudra Constructions & Suppliers',
    'construction company Bihar',
    'civil contractors Patna',
    'infrastructure construction India',
    'solar EPC India',
  ],
  openGraph: {
    title: 'RUDRA CONSTRUCTIONS & SUPPLIERS',
    description: 'Engineering Trust. Constructing Excellence. An interactive 3D experience across India.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#080909',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
