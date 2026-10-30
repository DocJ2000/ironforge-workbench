import { createContext, useContext } from 'react'
import type { RepositorySnapshot } from '../domain/repository'

export type RepositorySource = 'live' | 'demo'

export interface RegisteredProject {
  id: string
  repository: RepositorySnapshot
  connected: boolean
  lastOpened: string
  managed?: boolean
}

export interface RepositoryContextValue {
  repository: RepositorySnapshot
  projects: RegisteredProject[]
  selectedProjectId: string
  selectProject: (id: string) => void
  addProject: (path: string) => Promise<void>
  removeProject: (id: string, deleteLocalFiles?: boolean) => Promise<void>
  operationReady: boolean
  source: RepositorySource
  loading: boolean
  error: string | null
  /** Re-reads local snapshots without running `git fetch`. */
  refresh: () => Promise<void>
  /** Re-reads one project snapshot; used after an action on that project. */
  refreshProject: (projectId: string) => Promise<void>
  /** Re-reads snapshots after fetching the remote; use for explicit user refresh. */
  refreshRemote: () => Promise<void>
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null)

export function useRepository() {
  const context = useContext(RepositoryContext)
  if (!context) {
    throw new Error('useRepository must be used inside RepositoryProvider')
  }
  return context
}
