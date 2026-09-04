'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { company } from '@/data/company'
import {
  ADMIN_PASSCODE,
  ALL_INDIA_STATES,
  PRESENCE_STATES,
  PROJECT_CATEGORIES,
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
  makeProjectId,
  seedProjects,
} from '@/data/projects'
import type { Project } from '@/data/projects'
import { bindStorageSync, useProjectStore } from '@/lib/projects-store'

const SESSION_KEY = 'rudra.admin.session'

type Tab = 'overview' | 'projects'

const emptyForm = (): Project => ({
  id: '',
  name: '',
  category: PROJECT_CATEGORIES[1],
  client: '',
  state: 'Bihar',
  city: '',
  year: new Date().getFullYear(),
  status: 'Ongoing',
  value: '',
  description: '',
  featured: false,
})

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SESSION_KEY) === 'ok') setAuthed(true)
    } catch {
      // ignore
    }
  }, [])

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  return <AdminApp onLogout={() => setAuthed(false)} />
}

/* ------------------------------------------------------------------ */
/* Login                                                              */
/* ------------------------------------------------------------------ */

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    window.setTimeout(() => {
      if (passcode.trim() === ADMIN_PASSCODE) {
        try {
          window.localStorage.setItem(SESSION_KEY, 'ok')
        } catch {
          // ignore
        }
        onSuccess()
      } else {
        setError(true)
        setBusy(false)
      }
    }, 350)
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <p className="admin__brand">
          RUDRA<em>·ADMIN</em>
          <small>CONTENT MANAGEMENT PANEL</small>
        </p>
        <Link className="admin__btn admin__btn--ghost" href="/">
          ← VIEW SITE
        </Link>
      </header>
      <div className="admin__login">
        <form className="admin__login-card" onSubmit={submit}>
          <p className="eyebrow eyebrow--plain">RUDRA CONSTRUCTIONS &amp; SUPPLIERS</p>
          <h1 className="display display--xl" style={{ marginTop: 14 }}>
            ADMIN
            <br />
            SIGN IN
          </h1>
          <p className="admin__login-hint">
            Demo passcode for this build — change it in <code>src/data/projects.ts</code> before going live.
          </p>
          <div className="admin__login-form">
            <input
              type="password"
              value={passcode}
              onChange={(event) => {
                setPasscode(event.target.value)
                setError(false)
              }}
              placeholder="Passcode"
              aria-label="Admin passcode"
              autoFocus
            />
            <p className="admin__login-err" role="alert">
              {error ? 'INCORRECT PASSCODE — TRY AGAIN' : ''}
            </p>
            <button type="submit" className="admin__btn admin__btn--primary" disabled={busy || !passcode}>
              {busy ? 'CHECKING…' : 'SIGN IN →'}
            </button>
          </div>
          <Link className="admin__login-back" href="/">
            ← Back to the experience
          </Link>
        </form>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shell                                                              */
/* ------------------------------------------------------------------ */

function AdminApp({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const projects = useProjectStore((state) => state.projects)
  const hydrate = useProjectStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
    const unbind = bindStorageSync()
    return unbind
  }, [hydrate])

  const logOut = () => {
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      // ignore
    }
    onLogout()
  }

  return (
    <div className="admin">
      <header className="admin__bar">
        <p className="admin__brand">
          RUDRA<em>·ADMIN</em>
          <small>CONTENT MANAGEMENT PANEL</small>
        </p>
        <div className="admin__actions">
          <span className="admin__live">LIVE · SAVED IN BROWSER</span>
          <Link className="admin__btn admin__btn--ghost" href="/projects" target="_blank" rel="noopener">
            VIEW PROJECTS ↗
          </Link>
          <Link className="admin__btn admin__btn--ghost" href="/" target="_blank" rel="noopener">
            VIEW SITE ↗
          </Link>
          <button type="button" className="admin__btn admin__btn--danger" onClick={logOut}>
            SIGN OUT
          </button>
        </div>
      </header>

      <div className="admin__main">
        <aside className="admin__side">
          <button type="button" className="admin__tab" data-active={tab === 'overview'} onClick={() => setTab('overview')}>
            <span>01</span> Overview
          </button>
          <button type="button" className="admin__tab" data-active={tab === 'projects'} onClick={() => setTab('projects')}>
            <span>02</span> Projects
          </button>
          <p className="admin__side-label">This panel stores its edits in your browser — no server required.</p>
        </aside>

        <main className="admin__content">
          {tab === 'overview' ? (
            <Overview projects={projects} onChangeProjects={() => setTab('projects')} />
          ) : (
            <ProjectsManager projects={projects} />
          )}
        </main>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

function Overview({ projects, onChangeProjects }: { projects: Project[]; onChangeProjects: () => void }) {
  const restoreSeeds = useProjectStore((state) => state.restoreSeeds)
  const [confirmReset, setConfirmReset] = useState(false)
  const [toast, setToast] = useState('')

  const stats = useMemo(() => {
    const states = new Set(projects.map((p) => p.state))
    const cities = new Set(projects.map((p) => `${p.city}, ${p.state}`))
    return {
      total: projects.length,
      featured: projects.filter((p) => p.featured).length,
      states: states.size,
      cities: cities.size,
      completed: projects.filter((p) => p.status === 'Completed').length,
      ongoing: projects.filter((p) => p.status === 'Ongoing').length,
    }
  }, [projects])

  const changed = JSON.stringify(projects.map(({ id }) => id)) !== JSON.stringify(seedProjects.map(({ id }) => id))

  return (
    <>
      <div className="admin__content-head">
        <div>
          <h1 className="admin__title">OVERVIEW</h1>
          <p className="admin__sub">
            Everything on the public <Link href="/projects">Projects page ↗</Link> is managed from here. Edits appear on the site the moment you save — keep the
            site open in another tab and watch it update live.
          </p>
        </div>
      </div>

      <div className="admin__stats">
        <div className="admin__stat">
          <b>{stats.total}</b>
          <span>PROJECTS PUBLISHED</span>
        </div>
        <div className="admin__stat">
          <b>
            {stats.states}
            <em>states</em>
          </b>
          <span>COVERED ACROSS INDIA</span>
        </div>
        <div className="admin__stat">
          <b>
            {stats.cities}
            <em>cities</em>
          </b>
          <span>PROJECT LOCATIONS</span>
        </div>
        <div className="admin__stat">
          <b>
            {stats.completed}
            <em>/ {stats.ongoing} ongoing</em>
          </b>
          <span>COMPLETED DELIVERIES</span>
        </div>
        <div className="admin__stat">
          <b>{stats.featured}</b>
          <span>FEATURED ON TOP</span>
        </div>
      </div>

      <div className="admin__panel">
        <h3>How this panel works</h3>
        <ul>
          <li>
            <strong>Projects →</strong> add, edit, delete or re-feature any record. Required fields are the project name and city — the site renders the rest
            as provided.
          </li>
          <li>
            <strong>Storage</strong> is the browser&apos;s localStorage (key <code>rudra.projects.v1</code>). No backend, no account, works offline and on any
            static host. Clearing site data returns the site to its built-in records.
          </li>
          <li>
            <strong>Rows marked SAMPLE</strong> are the built-in starter records. They exist so the public Projects page is populated out of the box — replace
            them with Rudra&apos;s verified project data at any time.
          </li>
          <li>
            <strong>SEO note:</strong> the Projects page is fully crawlable and ships its default records in the HTML, so search engines index real content
            even before JavaScript runs.
          </li>
        </ul>
      </div>

      <div className="admin__panel">
        <h3>Danger zone</h3>
        <p>
          {changed
            ? 'Restore the Projects page to the built-in starter records. Your current edits will be replaced.'
            : 'The projects are currently identical to the built-in starter records. Nothing to restore.'}
        </p>
        {confirmReset ? (
          <>
            <p style={{ marginTop: 10, color: '#ff9d9d' }}>Are you sure? This cannot be undone.</p>
            <button
              type="button"
              className="admin__btn admin__btn--danger"
              onClick={() => {
                restoreSeeds()
                setConfirmReset(false)
                setToast('PROJECTS RESTORED TO STARTER RECORDS')
              }}
            >
              YES, RESTORE STARTER RECORDS
            </button>{' '}
            <button type="button" className="admin__btn admin__btn--ghost" onClick={() => setConfirmReset(false)}>
              CANCEL
            </button>
          </>
        ) : (
          <button type="button" className="admin__btn admin__btn--danger" onClick={() => setConfirmReset(true)}>
            RESTORE STARTER RECORDS
          </button>
        )}
      </div>

      <div className="admin__panel">
        <h3>Next steps</h3>
        <ul>
          <li>Add your first real project → the public Projects page and this dashboard update instantly.</li>
          <li>Pin up to three projects as featured → they surface first and show the ★ FEATURED mark.</li>
          <li>Point NEXT_PUBLIC_SITE_URL at your domain when deploying so sitemap.xml &amp; canonicals carry the right origin.</li>
          <li>Company facts (phone, email, services) still live in src/data/company.ts.</li>
        </ul>
        <button type="button" className="admin__btn admin__btn--primary" onClick={onChangeProjects}>
          MANAGE PROJECTS →
        </button>
      </div>

      {toast ? <Toast message={toast} onDone={() => setToast('')} /> : null}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Projects manager                                                   */
/* ------------------------------------------------------------------ */

function ProjectsManager({ projects }: { projects: Project[] }) {
  const addProject = useProjectStore((state) => state.addProject)
  const updateProject = useProjectStore((state) => state.updateProject)
  const removeProject = useProjectStore((state) => state.removeProject)
  const [editing, setEditing] = useState<Project | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const sorted = useMemo(() => {
    const order = { Completed: 0, Ongoing: 1, Planning: 2 } as const
    return [...projects].sort((a, b) => {
      if (Number(b.featured) !== Number(a.featured)) return Number(b.featured) - Number(a.featured)
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status]
      return a.name.localeCompare(b.name)
    })
  }, [projects])

  const openNew = () => {
    setIsNew(true)
    setEditing(emptyForm())
  }
  const openEdit = (project: Project) => {
    setIsNew(false)
    setEditing({ ...project })
  }
  const closeEditor = () => {
    setEditing(null)
    setIsNew(false)
  }

  const save = (project: Project) => {
    if (isNew) {
      addProject({ ...project, id: project.id || makeProjectId() })
      setToast('PROJECT ADDED — LIVE ON THE PROJECTS PAGE')
    } else {
      updateProject(project)
      setToast('PROJECT UPDATED — LIVE ON THE PROJECTS PAGE')
    }
    closeEditor()
  }

  const confirmDelete = (id: string) => {
    removeProject(id)
    setConfirmingId(null)
    setToast('PROJECT DELETED')
  }

  return (
    <>
      <div className="admin__content-head">
        <div>
          <h1 className="admin__title">PROJECTS</h1>
          <p className="admin__sub">
            {projects.length} records feed the public Projects page — name, service category, client, location, status and a short description. Star the ones
            to feature.
          </p>
        </div>
        <div className="admin__actions">
          <button type="button" className="admin__btn admin__btn--primary" onClick={openNew}>
            + NEW PROJECT
          </button>
        </div>
      </div>

      <div className="admin__table-wrap">
        <table className="admin__table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Category</th>
              <th>Location</th>
              <th>Year</th>
              <th>Status</th>
              <th>Featured</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr className="admin__empty-row">
                <td colSpan={7}>NO PROJECTS YET — ADD THE FIRST ONE</td>
              </tr>
            ) : (
              sorted.map((project) => (
                <tr key={project.id}>
                  <td className="p-name">
                    {project.name}
                    {project.id.startsWith('seed-') ? <span className="p-sample">SAMPLE</span> : null}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: 10.5, letterSpacing: '0.08em' }}>{project.category}</td>
                  <td className="p-loc">
                    {project.city}
                    <span style={{ color: 'var(--muted)' }}> · {project.state}</span>
                  </td>
                  <td>{project.year || '—'}</td>
                  <td>
                    <span className={`admin__badge admin__badge--${project.status.toLowerCase()}`}>
                      {PROJECT_STATUS_LABEL[project.status]}
                    </span>
                  </td>
                  <td>{project.featured ? '★' : '—'}</td>
                  <td>
                    <div className="admin__row-actions" style={{ justifyContent: 'flex-end' }}>
                      {confirmingId === project.id ? (
                        <>
                          <button type="button" className="admin__icon-btn admin__icon-btn--confirm" onClick={() => confirmDelete(project.id)}>
                            CONFIRM
                          </button>
                          <button type="button" className="admin__icon-btn" onClick={() => setConfirmingId(null)}>
                            KEEP
                          </button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="admin__icon-btn" onClick={() => openEdit(project)}>
                            EDIT
                          </button>
                          <button type="button" className="admin__icon-btn admin__icon-btn--del" onClick={() => setConfirmingId(project.id)}>
                            DELETE
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? <ProjectEditor project={editing} isNew={isNew} onSave={save} onClose={closeEditor} /> : null}
      {toast ? <Toast message={toast} onDone={() => setToast('')} /> : null}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Editor                                                             */
/* ------------------------------------------------------------------ */

function ProjectEditor({
  project,
  isNew,
  onSave,
  onClose,
}: {
  project: Project
  isNew: boolean
  onSave: (project: Project) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Project>(project)
  const [touched, setTouched] = useState(false)

  const invalid = !form.name.trim() || !form.city.trim()
  const set = <K extends keyof Project>(key: K, value: Project[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <div
      className="admin__editor"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="admin__editor-card" role="dialog" aria-modal="true" aria-label={isNew ? 'New project' : 'Edit project'}>
        <div className="admin__editor-head">
          <div>
            <h2>{isNew ? 'NEW PROJECT' : 'EDIT PROJECT'}</h2>
            <p>{isNew ? 'It goes live on the public Projects page the moment you save.' : `Editing “${project.name}”.`}</p>
          </div>
          <button type="button" className="admin__btn admin__btn--ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="admin__field">
          <label htmlFor="f-name">
            PROJECT NAME <em>*</em>
          </label>
          <input
            id="f-name"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
            placeholder="e.g. G+3 Residential Complex — Patna"
          />
        </div>

        <div className="admin__field-grid">
          <div className="admin__field">
            <label htmlFor="f-cat">SERVICE CATEGORY</label>
            <select id="f-cat" value={form.category} onChange={(event) => set('category', event.target.value)}>
              {PROJECT_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="admin__field">
            <label htmlFor="f-client">CLIENT</label>
            <input id="f-client" value={form.client} onChange={(event) => set('client', event.target.value)} placeholder="Client / organisation" />
          </div>
        </div>

        <div className="admin__field-grid">
          <div className="admin__field">
            <label htmlFor="f-state">STATE</label>
            <select id="f-state" value={form.state} onChange={(event) => set('state', event.target.value)}>
              <optgroup label="RUDRA PRESENCE">
                {[...PRESENCE_STATES].sort().map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ALL INDIA">
                {ALL_INDIA_STATES.filter((item) => !(PRESENCE_STATES as readonly string[]).includes(item)).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="admin__field">
            <label htmlFor="f-city">
              CITY / TOWN <em>*</em>
            </label>
            <input id="f-city" value={form.city} onChange={(event) => set('city', event.target.value)} placeholder="e.g. Patna" />
          </div>
        </div>

        <div className="admin__field-grid">
          <div className="admin__field">
            <label htmlFor="f-year">YEAR</label>
            <input
              id="f-year"
              type="number"
              min={2000}
              max={2100}
              value={form.year}
              onChange={(event) => set('year', event.target.value ? Number(event.target.value) : '')}
              placeholder="2026"
            />
          </div>
          <div className="admin__field">
            <label htmlFor="f-status">STATUS</label>
            <select id="f-status" value={form.status} onChange={(event) => set('status', event.target.value as Project['status'])}>
              {PROJECT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin__field">
          <label htmlFor="f-value">VALUE (OPTIONAL)</label>
          <input
            id="f-value"
            value={form.value}
            onChange={(event) => set('value', event.target.value)}
            placeholder='e.g. ₹3.20 Cr — leave blank until verified'
          />
        </div>

        <div className="admin__field">
          <label htmlFor="f-desc">DESCRIPTION</label>
          <textarea
            id="f-desc"
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
            placeholder="One short paragraph — scope, structure and what was delivered."
          />
        </div>

        <label className="admin__check">
          <input type="checkbox" checked={form.featured} onChange={(event) => set('featured', event.target.checked)} />
          ★ FEATURED — surfaces first on the Projects page
        </label>

        <div className="admin__editor-foot">
          {touched && invalid ? (
            <p style={{ alignSelf: 'center', marginRight: 'auto', fontSize: 10.5, letterSpacing: '0.14em', color: '#ff9d9d' }}>
              NAME &amp; CITY ARE REQUIRED
            </p>
          ) : (
            <p style={{ alignSelf: 'center', marginRight: 'auto', fontSize: 10.5, letterSpacing: '0.14em', color: 'var(--muted)' }}>
              {company.legalName} · {company.phone}
            </p>
          )}
          <button type="button" className="admin__btn admin__btn--ghost" onClick={onClose}>
            CANCEL
          </button>
          <button
            type="button"
            className="admin__btn admin__btn--primary"
            disabled={invalid}
            onClick={() => {
              setTouched(true)
              if (!invalid) onSave(form)
            }}
          >
            {isNew ? 'ADD PROJECT' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Toast                                                              */
/* ------------------------------------------------------------------ */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2600)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return <div className="admin__toast">✓ {message}</div>
}
