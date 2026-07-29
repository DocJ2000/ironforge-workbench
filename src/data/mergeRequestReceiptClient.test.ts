import { afterEach, expect, it } from 'vitest'
import { mergeRequestReceiptClient } from './mergeRequestReceiptClient'

afterEach(() => localStorage.clear())

it('restores and updates merge request tracking for a project', () => {
  mergeRequestReceiptClient.save('project-a', {
    iid: 9,
    webUrl: 'https://gitlab/project/-/merge_requests/9',
    sourceBranch: 'dev/T2',
    sourceCommit: 'abcdef123456',
    state: 'opened',
  })

  expect(mergeRequestReceiptClient.load('project-a')).toMatchObject({
    iid: 9,
    sourceBranch: 'dev/T2',
    state: 'opened',
  })
  mergeRequestReceiptClient.updateState('project-a', 'merged')
  expect(mergeRequestReceiptClient.load('project-a')?.state).toBe('merged')
})

it('rejects malformed merge request receipts', () => {
  localStorage.setItem('ironforge-workbench:merge-request:project-a', '{}')
  expect(mergeRequestReceiptClient.load('project-a')).toBeNull()
})
