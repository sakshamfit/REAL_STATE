import type { Metadata } from 'next'
import './admin.css'

export const metadata: Metadata = {
  title: 'Admin — RUDRA Content Panel',
  description: 'RUDRA Constructions & Suppliers content administration — manage the projects shown on the public site.',
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: '/admin' },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
