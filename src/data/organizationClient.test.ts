import { afterEach, expect, it, vi } from 'vitest'
import { organizationClient } from './organizationClient'

const credentials = {
  status: vi.fn(),
  save: vi.fn(),
  clear: vi.fn(),
}

afterEach(() => {
  localStorage.clear()
  delete window.ironforgeDesktop
})

it('waits for durable desktop storage before completing a save', async () => {
  let finishSave: ((value: {
    gitlabUrl: string
    ironforgeUrl: string
    connectionVerified: boolean
  }) => void) | undefined
  const save = vi.fn().mockImplementation(() => new Promise((resolve) => {
    finishSave = resolve
  }))
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials,
    settings: {
      load: vi.fn(),
      save,
    },
  }

  let completed = false
  const saving = organizationClient.saveDurable({
    gitlabUrl: 'https://git.example.com/',
    ironforgeUrl: 'https://delivery.example.com/projects/',
    connectionVerified: true,
  }).then(() => { completed = true })

  await Promise.resolve()
  expect(completed).toBe(false)
  finishSave?.({
    gitlabUrl: 'https://git.example.com',
    ironforgeUrl: 'https://delivery.example.com/projects',
    connectionVerified: true,
  })
  await saving
  expect(completed).toBe(true)
})

it('restores durable settings after browser storage is empty', async () => {
  window.ironforgeDesktop = {
    platform: 'win32',
    packaged: true,
    credentials,
    settings: {
      load: vi.fn().mockResolvedValue({
        gitlabUrl: 'https://git.example.com',
        ironforgeUrl: 'https://delivery.example.com/projects',
        connectionVerified: true,
      }),
      save: vi.fn(),
    },
  }

  await expect(organizationClient.loadDurable()).resolves.toMatchObject({
    gitlabUrl: 'https://git.example.com',
    connectionVerified: true,
  })
})
