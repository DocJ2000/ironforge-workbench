import { afterEach, expect, it } from 'vitest'
import { workflowDraftClient } from './workflowDraftClient'

afterEach(() => localStorage.clear())

it('keeps upload drafts separate for every project', () => {
  workflowDraftClient.saveUpload('project-a', {
    step: 3,
    selectedPackageIds: ['mechanical'],
    branch: 'dev/T2',
    title: '更新结构件',
    description: '补充图纸',
  })

  expect(workflowDraftClient.loadUpload('project-a')).toMatchObject({
    step: 3,
    selectedPackageIds: ['mechanical'],
    branch: 'dev/T2',
    title: '更新结构件',
  })
  expect(workflowDraftClient.loadUpload('project-b')).toBeNull()
})

it('keeps merge request drafts and clears completed workflows', () => {
  workflowDraftClient.saveMergeRequest('project-a', {
    step: 2,
    title: 'T2 交付',
    description: '请审核',
    links: ['https://example.com/doc'],
    assigneeIds: [8],
    reviewerIds: [7],
    tagEnabled: true,
    tagName: 'T2-第二次打样',
    tagMessage: '供应商打样版本',
  })

  expect(workflowDraftClient.loadMergeRequest('project-a')).toMatchObject({
    step: 2,
    assigneeIds: [8],
    reviewerIds: [7],
    tagName: 'T2-第二次打样',
  })
  workflowDraftClient.clearMergeRequest('project-a')
  expect(workflowDraftClient.loadMergeRequest('project-a')).toBeNull()
})

it('ignores malformed or obsolete drafts', () => {
  localStorage.setItem('ironforge-workbench:workflow:upload:project-a', '{}')
  expect(workflowDraftClient.loadUpload('project-a')).toBeNull()
})
