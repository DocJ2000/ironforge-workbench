import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getDemoRepository } from './demoRepository'
import {
  RepositoryContext,
  type RepositorySource,
} from './repositoryContext'
import { fetchRepositorySnapshot } from './repositoryClient'

export function RepositoryProvider({ children }: PropsWithChildren) {
  const [repository, setRepository] = useState(getDemoRepository())
  const [source, setSource] = useState<RepositorySource>('demo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchRepositorySnapshot()
      setRepository(response.repository)
      setSource('live')
      setError(null)
    } catch {
      setError('无法读取本地仓库，当前显示演示数据')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ repository, source, loading, error, refresh }),
    [error, loading, refresh, repository, source],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}
