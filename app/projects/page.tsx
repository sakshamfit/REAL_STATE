'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { company } from '@/data/company'
import { ALL_INDIA_STATES, PROJECT_CATEGORIES, PROJECT_STATUS_LABEL } from '@/data/projects'
import type { Project } from '@/data/projects'
import { bindStorageSync, useProjectStore } from '@/lib/projects-store'
import { ProjectsShell } from './shell'
import './projects.css'

export default function ProjectsPage() {
  const projects = useProjectStore((state) => state.projects)
  const hydrate = useProjectStore((state) => state.hydrate)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('ALL')
  const [stateName, setStateName] = useState('ALL')
  const [status, setStatus] = useState('ALL')

  useEffect(() => {
    hydrate()
    const unbind = bindStorageSync()
    return unbind
  }, [hydrate])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((project) => {
      if (category !== 'ALL' && project.category !== category) return false
      if (stateName !== 'ALL' && project.state !== stateName) return false
      if (status !== 'ALL' && project.status !== status) return false
      if (!q) return true
      const haystack = [project.name, project.client, project.city, project.state, project.description]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [projects, query, category, stateName, status])

  const sortKey = (project: Project) => (project.featured ? 0 : 1)
  const shown = [...visible].sort((a, b) => sortKey(a) - sortKey(b))
  const stateOptions = useMemo(() => {
    const used = new Set(projects.map((project) => project.state))
    const union = Array.from(new Set([...used, ...ALL_INDIA_STATES])).sort()
    return union
  }, [projects])

  return (
    <ProjectsShell>
      <section className="projects__hero">
        <p className="eyebrow eyebrow--plain">RUDRA · SELECTED WORK</p>
        <h1 className="display display--xl">
          <span className="line">
            <span>OUR</span>
          </span>
          <span className="line">
            <span>PROJECTS</span>
          </span>
        </h1>
        <p className="projects__lead">
          Built by Rudra across {new Set(projects.map((p) => p.state)).size} Indian {projects.length === 1 ? 'state' : 'states'} — residential, infrastructure, solar,
          renovation and materials. New records are published straight from the <Link href="/admin">admin panel</Link>.
        </p>
      </section>

      <section className="projects__filters" aria-label="Filter projects">
        <input
          type="search"
          className="projects__search"
          placeholder="Search projects, clients, cities…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search projects"
        />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by service">
          <option value="ALL">ALL SERVICES</option>
          {PROJECT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={stateName} onChange={(event) => setStateName(event.target.value)} aria-label="Filter by state">
          <option value="ALL">ALL INDIA</option>
          {stateOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status">
          <option value="ALL">ALL STATUS</option>
          <option value="Completed">COMPLETED</option>
          <option value="Ongoing">ONGOING</option>
          <option value="Planning">PLANNING</option>
        </select>
      </section>

      {shown.length === 0 ? (
        <div className="projects__empty">
          <p className="display">NO MATCHING PROJECTS</p>
          <p>Clear the filters, or add a project from the admin panel.</p>
        </div>
      ) : (
        <>
          <p className="projects__count" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'PROJECT' : 'PROJECTS'}
          </p>
          <ul className="projects__grid">
            {shown.map((project) => (
              <li key={project.id} className={`project-card ${project.featured ? 'project-card--featured' : ''}`}>
                <div className="project-card__top">
                  <span className="project-card__category">{project.category}</span>
                  {project.featured ? (
                    <span className="project-card__featured" title="Featured project">
                      ★ FEATURED
                    </span>
                  ) : null}
                </div>
                <h2 className="project-card__name">{project.name}</h2>
                <p className="project-card__desc">{project.description}</p>
                <dl className="project-card__meta">
                  <div>
                    <dt>LOCATION</dt>
                    <dd>
                      {project.city}, {project.state}
                    </dd>
                  </div>
                  {project.client ? (
                    <div>
                      <dt>CLIENT</dt>
                      <dd>{project.client}</dd>
                    </div>
                  ) : null}
                  {project.year ? (
                    <div>
                      <dt>YEAR</dt>
                      <dd>{project.year}</dd>
                    </div>
                  ) : null}
                  {project.value ? (
                    <div>
                      <dt>VALUE</dt>
                      <dd>{project.value}</dd>
                    </div>
                  ) : null}
                </dl>
                <div className="project-card__foot">
                  <span className={`project-card__status project-card__status--${project.status.toLowerCase()}`}>
                    {PROJECT_STATUS_LABEL[project.status]}
                  </span>
                  <a className="project-card__cta" href={`mailto:${company.email}?subject=Enquiry: ${encodeURIComponent(project.name)}`}>
                    ENQUIRE →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </ProjectsShell>
  )
}
