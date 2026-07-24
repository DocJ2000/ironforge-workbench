import { createContext, useContext } from 'react'
import type { RepositorySnapshot } from '../domain/repository'

export type RepositorySource = 'live' | 'demo'

export interface RepositoryContextValue {
  repository: RepositorySnapshot
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
