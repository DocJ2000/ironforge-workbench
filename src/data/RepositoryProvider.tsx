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
  type RegisteredProject,
  type RepositorySource,
} from './repositoryContext'
import { fetchRepositorySnapshot } from './repositoryClient'

export function RepositoryProvider({ children }: PropsWithChildren) {
  const previewRepository = useMemo(() => {
    const base = getDemoRepository()
    return {
      ...base,
      id: 'aurora-lens-mechanics',
      name: 'aurora-lens-mechanics',
      displayName: 'Aurora Lens Mechanics',
      path: 'D:\\Projects\\Aurora\\lens-mechanics',
      gitlabPath: 'rockteam/aurora/optics/lens-mechanics',
      branch: 'dev/T1',
      stage: 'T1 设计',
      changes: base.changes.slice(0, 2),
      ahead: 0,
      behind: 2,
    }
  }, [])
  const [liveRepository, setLiveRepository] = useState(getDemoRepository())
  const [selectedProjectId, setSelectedProjectId] = useState(liveRepository.id)
  const [source, setSource] = useState<RepositorySource>('demo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchRepositorySnapshot()
      setLiveRepository((current) => {
        setSelectedProjectId((selected) =>
          selected === current.id ? response.repository.id : selected,
        )
        return response.repository
      })
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

  const projects = useMemo<RegisteredProject[]>(
    () => [
      {
        id: liveRepository.id,
        repository: liveRepository,
        connected: true,
        lastOpened: '刚刚',
      },
      {
        id: previewRepository.id,
        repository: previewRepository,
        connected: false,
        lastOpened: '7 月 18 日',
      },
    ],
    [liveRepository, previewRepository],
  )
  const repository =
    projects.find((project) => project.id === selectedProjectId)?.repository ??
    liveRepository
  const operationReady =
    projects.find((project) => project.id === selectedProjectId)?.connected ??
    false
  const selectProject = useCallback((id: string) => setSelectedProjectId(id), [])
  const value = useMemo(
    () => ({
      repository,
      projects,
      selectedProjectId,
      selectProject,
      operationReady,
      source,
      loading,
      error,
      refresh,
    }),
    [
      error,
      loading,
      operationReady,
      projects,
      refresh,
      repository,
      selectedProjectId,
      selectProject,
      source,
    ],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}
