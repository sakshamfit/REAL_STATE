'use client'

import Link from 'next/link'
import { company } from '@/data/company'

/** Shared header/footer used by the public Projects page. */
export function ProjectsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="projects">
      <header className="projects__top">
        <Link className="projects__brand" href="/">
          RUDRA
          <small>CONSTRUCTIONS &amp; SUPPLIERS</small>
        </Link>
        <nav className="projects__nav" aria-label="Primary">
          <Link href="/">Experience</Link>
          <Link href="/projects" data-active="true">
            Projects
          </Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </header>
      <div className="projects__body">{children}</div>
      <footer className="projects__footer">
        <p className="projects__footer-brand">{company.legalName}</p>
        <p className="projects__footer-line">{company.copyright}</p>
      </footer>
    </div>
  )
}
