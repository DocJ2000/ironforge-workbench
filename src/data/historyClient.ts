import type { HistoryEvent } from '../domain/repository'

export async function fetchGitLabHistory(projectId: string) {
  const response = await fetch(
    `/api/gitlab/history?projectId=${encodeURIComponent(projectId)}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  )
  const payload = (await response.json()) as {
    history?: HistoryEvent[]
    error?: string
  }
  if (!response.ok) throw new Error(payload.error ?? '无法读取 GitLab 历史')
  return payload.history ?? []
}
