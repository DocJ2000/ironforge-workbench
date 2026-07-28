// @vitest-environment node

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { startLocalServer } from './localServer'

const roots: string[] = []
const servers: Array<{ close: () => Promise<void> }> = []

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

it('serves the desktop app and preserves client-side routes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-desktop-'))
  roots.push(root)
  await writeFile(join(root, 'index.html'), '<main>workbench</main>')
  const server = await startLocalServer({
    staticRoot: root,
    middleware: (_request, _response, next) => next(),
  })
  servers.push(server)

  await expect(fetch(`${server.origin}/workspace/upload`).then((response) => response.text()))
    .resolves.toContain('workbench')
})

it('lets API middleware answer before the static fallback', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-desktop-'))
  roots.push(root)
  await writeFile(join(root, 'index.html'), '<main>workbench</main>')
  const server = await startLocalServer({
    staticRoot: root,
    middleware: (request, response, next) => {
      if (request.url === '/api/health') {
        response.end('healthy')
      } else {
        next()
      }
    },
  })
  servers.push(server)

  await expect(fetch(`${server.origin}/api/health`).then((response) => response.text()))
    .resolves.toBe('healthy')
})

it('rejects cross-origin and origin-less writes to local API routes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ironforge-static-'))
  roots.push(root)
  await writeFile(join(root, 'index.html'), '<main>workbench</main>')
  const middleware = vi.fn()
  const server = await startLocalServer({ staticRoot: root, middleware })
  servers.push(server)

  const crossOrigin = await fetch(`${server.origin}/api/projects`, {
    method: 'POST',
    headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' },
    body: '{}',
  })
  const noOrigin = await fetch(`${server.origin}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })

  expect(crossOrigin.status).toBe(403)
  expect(noOrigin.status).toBe(403)
  expect(middleware).not.toHaveBeenCalled()
})
