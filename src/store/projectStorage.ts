import { EMPTY_PROJECT, type ViyeuticaProject } from '../domain/project'

const STORAGE_KEY = 'viyeutica.project.v1'
export const PROJECT_UPDATED_EVENT = 'viyeutica:project-updated'

export function loadProject(): ViyeuticaProject {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY_PROJECT)
    const parsed = JSON.parse(raw) as Partial<ViyeuticaProject>
    if (parsed.schemaVersion !== 1) return structuredClone(EMPTY_PROJECT)
    return {
      ...structuredClone(EMPTY_PROJECT),
      ...parsed,
      center: { ...structuredClone(EMPTY_PROJECT.center), ...(parsed.center ?? {}) },
      academicYear: { ...EMPTY_PROJECT.academicYear, ...(parsed.academicYear ?? {}) },
      groups: Array.isArray(parsed.groups) ? parsed.groups : [],
    }
  } catch {
    return structuredClone(EMPTY_PROJECT)
  }
}

export function saveProject(project: ViyeuticaProject) {
  const next = { ...project, updatedAt: new Date().toISOString() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(PROJECT_UPDATED_EVENT, { detail: next }))
  return next
}

export function resetProject() {
  window.localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new CustomEvent(PROJECT_UPDATED_EVENT, { detail: structuredClone(EMPTY_PROJECT) }))
}
