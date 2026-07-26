import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getDemoRepository } from './demoRepository'
import { projectClient } from './projectClient'
import {
  RepositoryContext,
  type RegisteredProject,
  type RepositorySource,
} from './repositoryContext'
import { fetchRepositorySnapshot } from './repositoryClient'

export function RepositoryProvider({ children }: PropsWithChildren) {
  const demo = getDemoRepository()
  const [projects, setProjects] = useState<RegisteredProject[]>([
    {
      id: demo.id,
      repository: demo,
      connected: false,
      lastOpened: '正在读取',
    },
  ])
  const [selectedProjectId, setSelectedProjectId] = useState(demo.id)
  const [source, setSource] = useState<RepositorySource>('demo')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    try {
      const { projects: records } = await projectClient.list()
      const snapshots = await Promise.all(
        records.map(async (record) => ({
          id: record.id,
          repository: (await fetchRepositorySnapshot(record.id)).repository,
          connected: true,
          lastOpened: new Date(record.addedAt).toLocaleDateString('zh-CN'),
        })),
      )
      if (!snapshots.length) throw new Error('还没有登记本地项目')
      setProjects(snapshots)
      setSelectedProjectId((current) =>
        snapshots.some((project) => project.id === current)
          ? current
          : snapshots[0].id,
      )
      setSource('live')
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : '无法读取本地项目，当前显示演示数据',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchRepositorySnapshot(selectedProjectId)
      setProjects((current) =>
        current.map((project) =>
          project.id === selectedProjectId
            ? { ...project, repository: response.repository }
            : project,
        ),
      )
      setSource('live')
      setError(null)
    } catch {
      setError('无法读取当前本地仓库')
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId])

  const addProject = useCallback(
    async (path: string) => {
      await projectClient.add(path)
      await loadProjects()
    },
    [loadProjects],
  )
  const removeProject = useCallback(
    async (id: string) => {
      await projectClient.remove(id)
      await loadProjects()
    },
    [loadProjects],
  )
  const selectProject = useCallback((id: string) => setSelectedProjectId(id), [])
  const repository =
    projects.find((project) => project.id === selectedProjectId)?.repository ??
    projects[0].repository
  const operationReady =
    projects.find((project) => project.id === selectedProjectId)?.connected ??
    false

  const value = useMemo(
    () => ({
      repository,
      projects,
      selectedProjectId,
      selectProject,
      addProject,
      removeProject,
      operationReady,
      source,
      loading,
      error,
      refresh,
    }),
    [
      addProject,
      error,
      loading,
      operationReady,
      projects,
      refresh,
      removeProject,
      repository,
      selectedProjectId,
      selectProject,
      source,
    ],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}
