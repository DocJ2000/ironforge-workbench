import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getDemoRepository } from './demoRepository'
import { projectClient } from './projectClient'
import {
  RepositoryContext,
  type RegisteredProject,
  type RepositorySource,
} from './repositoryContext'
import { fetchRepositorySnapshot, fetchRepositorySummaries } from './repositoryClient'

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
  // Only the newest read may publish its result; an older, slower scan must not
  // overwrite the list the user is looking at.
  const latestLoad = useRef(0)
  const projectsRef = useRef(projects)
  const selectedIdRef = useRef(selectedProjectId)
  // Projects whose row currently holds a full snapshot rather than a summary.
  const hydrated = useRef(new Set<string>())

  useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  useEffect(() => {
    selectedIdRef.current = selectedProjectId
  }, [selectedProjectId])

  /**
   * The list is built from cheap summaries. The project being opened is then
   * replaced with a full snapshot (branches, delivery packages, recent history)
   * so pages that need those details behave as before.
   */
  const hydrateProject = useCallback(async (projectId: string) => {
    if (!projectId || hydrated.current.has(projectId)) return
    const loadId = latestLoad.current
    const { repository } = await fetchRepositorySnapshot(projectId)
    if (loadId !== latestLoad.current) return
    hydrated.current.add(projectId)
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, repository } : project,
      ),
    )
  }, [])

  const loadProjects = useCallback(async (options: { refresh?: boolean } = {}) => {
    const loadId = latestLoad.current + 1
    latestLoad.current = loadId
    setLoading(true)
    try {
      const { projects: records } = await projectClient.list()
      const { projects: summaries } = await fetchRepositorySummaries({
        refresh: options.refresh,
      })
      const byId = new Map(summaries.map((entry) => [entry.id, entry]))
      hydrated.current.clear()
      const snapshots = records.flatMap((record) => {
        const entry = byId.get(record.id)
        if (!entry?.repository) return []
        return [{
          id: record.id,
          repository: entry.repository,
          connected: true,
          lastOpened: new Date(record.addedAt).toLocaleDateString('zh-CN'),
          managed: record.managed === true,
        }]
      })
      if (loadId !== latestLoad.current) return
      if (!snapshots.length) {
        setProjects([])
        setSelectedProjectId('')
        setSource('live')
        setError(records.length ? '无法读取任何项目的本地状态' : null)
        return
      }
      const nextId = snapshots.some((project) => project.id === selectedIdRef.current)
        ? selectedIdRef.current
        : snapshots[0].id
      setProjects(snapshots)
      setSelectedProjectId(nextId)
      setSource('live')
      setError(null)
      void hydrateProject(nextId).catch(() => {
        // The list is still usable with the summary until the next attempt.
      })
    } catch (cause) {
      if (loadId !== latestLoad.current) return
      setError(
        cause instanceof Error
          ? cause.message
          : '无法读取本地项目，当前显示演示数据',
      )
    } finally {
      if (loadId === latestLoad.current) setLoading(false)
    }
  }, [hydrateProject])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  // Reading local snapshots is cheap enough for page transitions; only the
  // explicit "刷新项目概况" action should also fetch the remote.
  const refresh = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  /**
   * After one project changes (upload, checkout, pull) only that snapshot
   * needs to be re-read. Re-loading every registered project used to re-run a
   * git scan for each of them on every action.
   */
  const refreshProject = useCallback(async (projectId: string) => {
    if (!projectId) return
    if (!projectsRef.current.some((project) => project.id === projectId)) return
    const loadId = latestLoad.current
    const { repository: snapshot } = await fetchRepositorySnapshot(projectId)
    if (loadId !== latestLoad.current) return
    hydrated.current.add(projectId)
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, repository: snapshot } : project,
      ),
    )
  }, [])

  const refreshRemote = useCallback(async () => {
    await loadProjects({ refresh: true })
  }, [loadProjects])

  const addProject = useCallback(
    async (path: string) => {
      const { project } = await projectClient.add(path)
      await loadProjects()
      setSelectedProjectId(project.id)
    },
    [loadProjects],
  )
  const removeProject = useCallback(
    async (id: string, deleteLocalFiles = false) => {
      await projectClient.remove(id, deleteLocalFiles)
      await loadProjects()
    },
    [loadProjects],
  )
  const selectProject = useCallback((id: string) => {
    setSelectedProjectId(id)
    void hydrateProject(id).catch(() => {
      // Keep the summary row; the next refresh retries the full snapshot.
    })
  }, [hydrateProject])
  const repository =
    projects.find((project) => project.id === selectedProjectId)?.repository ??
    projects[0]?.repository ?? demo
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
      refreshProject,
      refreshRemote,
    }),
    [
      addProject,
      error,
      loading,
      operationReady,
      projects,
      refresh,
      refreshProject,
      refreshRemote,
      removeProject,
      repository,
      selectedProjectId,
      selectProject,
      source,
    ],
  )

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}
