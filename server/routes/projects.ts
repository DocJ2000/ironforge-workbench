import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ProjectRegistry } from '../projectRegistry.js'
import type { RepositorySnapshot } from '../../src/domain/repository.js'
import { mapWithConcurrency } from '../asyncPool.js'
import { readJson, sendJson } from '../http.js'

type Registry = Pick<ProjectRegistry, 'list' | 'add' | 'remove' | 'resolve'>

/**
 * `/api/projects` — the project registry used by the project list page.
 *
 * `GET` lists, `POST` registers an existing folder, `DELETE` removes the record
 * (and only deletes files for folders this app downloaded itself).
 */
export async function handleProjectsRoute(input: {
  request: IncomingMessage
  response: ServerResponse
  registry?: Registry
  repositoryPath: string
}) {
  const { request, response, registry, repositoryPath } = input

  if (!registry) {
    sendJson(response, 200, {
      projects: [{ id: 'default', path: repositoryPath }],
    })
    return
  }

  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { projects: await registry.list() })
      return
    }
    if (request.method === 'POST') {
      const body = await readJson<{ path: string }>(request)
      sendJson(response, 201, { project: await registry.add(body.path) })
      return
    }
    if (request.method === 'DELETE') {
      const body = await readJson<{ id: string; deleteLocalFiles?: boolean }>(request)
      sendJson(response, 200, {
        project: await registry.remove(body.id, body.deleteLocalFiles === true),
      })
      return
    }
    sendJson(response, 405, { error: 'Method not allowed' })
  } catch (error) {
    sendJson(response, 400, {
      error: error instanceof Error ? error.message : '项目操作失败',
    })
  }
}

/**
 * `/api/projects/summaries` — one cheap snapshot per registered project.
 *
 * The project list only needs branch, change count and sync state. Scanning the
 * delivery packages and every branch for each project at launch made startup
 * slow on large CAD folders; the selected project is hydrated fully afterwards.
 * A project that fails to scan is reported per row instead of failing the list.
 */
export async function handleProjectSummaries(input: {
  request: IncomingMessage
  response: ServerResponse
  registry?: Registry
  repositoryPath: string
  loadSummary: (
    path: string,
    projectId: string,
    refresh: boolean,
  ) => Promise<RepositorySnapshot>
}) {
  const { request, response, registry, repositoryPath, loadSummary } = input
  try {
    const records = registry
      ? await registry.list()
      : [{
          id: 'default',
          path: repositoryPath,
          name: 'default',
          gitlabRemote: '',
          addedAt: '',
        }]
    const refresh = new URL(request.url ?? '/', 'http://localhost')
      .searchParams.get('refresh') === '1'
    const projects = await mapWithConcurrency(records, 4, async (record) => {
      try {
        return {
          id: record.id,
          repository: await loadSummary(record.path, record.id, refresh),
        }
      } catch (error) {
        return {
          id: record.id,
          error: error instanceof Error ? error.message : '无法读取项目',
        }
      }
    })
    sendJson(response, 200, { projects })
  } catch {
    sendJson(response, 500, { error: '无法读取项目列表' })
  }
}
