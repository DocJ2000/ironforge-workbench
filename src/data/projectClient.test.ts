import { afterEach, expect, it, vi } from 'vitest'
import { projectClient } from './projectClient'

afterEach(() => vi.unstubAllGlobals())

it('lists and registers projects through the backend registry', async () => {
  const fetcher = vi.fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ projects: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ project: { id: 'project-one' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  vi.stubGlobal('fetch', fetcher)

  await projectClient.list()
  await projectClient.add('D:\\Projects\\one')

  expect(fetcher).toHaveBeenNthCalledWith(
    2,
    '/api/projects',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ path: 'D:\\Projects\\one' }),
    }),
  )
})

it('only requests local file deletion when the user explicitly chose it', async () => {
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ project: { id: 'project-one' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
  vi.stubGlobal('fetch', fetcher)

  await projectClient.remove('project-one', true)

  expect(fetcher).toHaveBeenCalledWith(
    '/api/projects',
    expect.objectContaining({
      method: 'DELETE',
      body: JSON.stringify({ id: 'project-one', deleteLocalFiles: true }),
    }),
  )
})
