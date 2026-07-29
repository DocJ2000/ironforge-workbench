import { afterEach, expect, it } from 'vitest'
import { navigationMemoryClient } from './navigationMemoryClient'

afterEach(() => localStorage.clear())

it('remembers the last meaningful GitLab page', () => {
  navigationMemoryClient.rememberGitLab('/workspace/upload/gitlab')
  expect(navigationMemoryClient.gitLabDestination()).toBe('/workspace/upload/gitlab')

  navigationMemoryClient.rememberGitLab('/ironforge')
  expect(navigationMemoryClient.gitLabDestination()).toBe('/workspace/upload/gitlab')
})

it('falls back to the project list for invalid saved routes', () => {
  localStorage.setItem('ironforge-workbench:navigation:gitlab', 'https://example.com')
  expect(navigationMemoryClient.gitLabDestination()).toBe('/workspace')
})
