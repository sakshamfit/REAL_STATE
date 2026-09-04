'use client'

/**
 * RUDRA — content store (projects).
 *
 * Backed by localStorage so the /admin panel can edit the public Projects
 * section without a backend: seed rows render on first load (SSR-safe), and
 * any admin changes are merged in on the client. A `storage` listener keeps
 * the admin panel and the public pages in sync across tabs.
 */

import { create } from 'zustand'
import type { Project } from '@/data/projects'
import { seedProjects, STORAGE_KEY } from '@/data/projects'

type ProjectState = {
  projects: Project[]
  hydrated: boolean
  hydrate: () => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (id: string) => void
  restoreSeeds: () => void
}

function readStored(): Project[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { projects?: Project[] }
    if (!Array.isArray(parsed.projects)) return null
    return parsed.projects.length ? parsed.projects : null
  } catch {
    return null
  }
}

function writeStored(projects: Project[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, projects }))
  } catch {
    // storage full / private mode — edits simply stay in memory
  }
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: seedProjects,
  hydrated: false,

  hydrate: () =>
    set((state) => {
      if (state.hydrated) return state
      const stored = readStored()
      return stored ? { projects: stored, hydrated: true } : { hydrated: true }
    }),

  addProject: (project) =>
    set((state) => {
      const projects = [...state.projects, project]
      writeStored(projects)
      return { projects }
    }),

  updateProject: (project) =>
    set((state) => {
      const projects = state.projects.map((item) => (item.id === project.id ? project : item))
      writeStored(projects)
      return { projects }
    }),

  removeProject: (id) =>
    set((state) => {
      const projects = state.projects.filter((item) => item.id !== id)
      writeStored(projects)
      return { projects }
    }),

  restoreSeeds: () => {
    writeStored(seedProjects)
    set({ projects: seedProjects })
  },
}))

/** Keeps every open tab (admin + public pages) in sync via `storage` events. */
export function bindStorageSync() {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return
    try {
      const parsed = JSON.parse(event.newValue) as { projects?: Project[] }
      if (Array.isArray(parsed.projects)) {
        useProjectStore.setState({ projects: parsed.projects, hydrated: true })
      }
    } catch {
      // ignore malformed payloads
    }
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/** id → project (used by both admin editing and public rendering). */
export function projectById(id: string | null): Project | undefined {
  if (!id) return undefined
  return useProjectStore.getState().projects.find((project) => project.id === id)
}
