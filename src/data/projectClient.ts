export interface ProjectRecord {
  id: string
  path: string
  name: string
  gitlabRemote: string
  addedAt: string
}

async function projectRequest<T>(init?: RequestInit): Promise<T> {
  const response = await fetch('/api/projects', {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  const payload = (await response.json()) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? '项目操作失败')
  return payload
}

export const projectClient = {
  list: () => projectRequest<{ projects: ProjectRecord[] }>(),
  add: (path: string) =>
    projectRequest<{ project: ProjectRecord }>({
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
  remove: (id: string) =>
    projectRequest<{ project: ProjectRecord }>({
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
}
