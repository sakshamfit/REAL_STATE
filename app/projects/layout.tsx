import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site-url'
import { seedProjects } from '@/data/projects'

export const metadata: Metadata = {
  title: 'Projects | RUDRA Constructions & Suppliers — Construction Projects in Bihar & Assam',
  description:
    'Completed and ongoing construction projects by Rudra Constructions & Suppliers — group housing in Patna, rural infrastructure in Bettiah, school retrofit in Biswanath, rooftop solar in Jorhat and more across Bihar and Assam.',
  alternates: { canonical: '/projects' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Projects — RUDRA Constructions & Suppliers',
    description:
      'See the construction projects Rudra Constructions & Suppliers builds across Bihar and Assam: residential, infrastructure, solar, renovation and building materials.',
    url: `${SITE_URL}/projects`,
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'RUDRA CONSTRUCTIONS & SUPPLIERS projects' }],
  },
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  const items = seedProjects.map((project, index) => ({
    '@type': 'CreativeWork' as const,
    position: index + 1,
    name: `${project.name} — ${project.city}, ${project.state}`,
    description: project.description,
    dateCreated: project.year ? String(project.year) : undefined,
    category: project.category,
    author: { '@type': 'Organization', name: 'RUDRA Constructions & Suppliers' },
  }))
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'RUDRA Construction Projects',
      itemListElement: items,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Projects', item: `${SITE_URL}/projects` },
      ],
    },
  ]
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {children}
    </>
  )
}
