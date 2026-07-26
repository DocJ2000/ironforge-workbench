import { createContext, useContext } from 'react'
import type { RepositorySnapshot } from '../domain/repository'

export type RepositorySource = 'live' | 'demo'

export interface RegisteredProject {
  id: string
  repository: RepositorySnapshot
  connected: boolean
  lastOpened: string
}

export interface RepositoryContextValue {
  repository: RepositorySnapshot
  projects: RegisteredProject[]
  selectedProjectId: string
  selectProject: (id: string) => void
  addProject: (path: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  operationReady: boolean
  source: RepositorySource
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export const RepositoryContext = createContext<RepositoryContextValue | null>(null)

export function useRepository() {
  const context = useContext(RepositoryContext)
  if (!context) {
    throw new Error('useRepository must be used inside RepositoryProvider')
  }
  return context
}
