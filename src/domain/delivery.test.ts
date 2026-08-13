import { describe, expect, it } from 'vitest'
import {
  validateDeliveryDraft,
  validateGitLabSyncDraft,
  validateMergeRequestDraft,
} from './delivery'

describe('validateDeliveryDraft', () => {
  it('requires changes, a commit message, an MR title, and a reviewer', () => {
    expect(
      validateDeliveryDraft({
        message: '',
        changePaths: [],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [],
        targetBranch: 'main',
        mrTitle: '',
      }),
    ).toEqual([
      '没有需要提交的文件',
      '请填写本次改动说明',
      '请填写管理员审核单标题',
      '至少选择一位审核人',
    ])
  })

  it('allows GitLab-only synchronization with no output package', () => {
    expect(
      validateDeliveryDraft({
        message: '更新结构设计',
        changePaths: ['source/part.prt'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [23],
        targetBranch: 'main',
        mrTitle: '更新结构设计',
      }),
    ).toEqual([])
  })

  it('rejects an empty target branch', () => {
    expect(
      validateDeliveryDraft({
        message: '更新结构设计',
        changePaths: ['source/part.prt'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        reviewerIds: [23],
        targetBranch: ' ',
        mrTitle: '更新结构设计',
      }),
    ).toContain('请选择要交付到的正式版本')
  })
})

describe('split GitLab actions', () => {
  it('allows synchronization without a reviewer', () => {
    expect(
      validateGitLabSyncDraft({
        message: '同步机械图纸',
        changePaths: ['output/mechanical/五金件/导轴.pdf'],
        confirmedDeletions: [],
        selectedPackageIds: ['output/mechanical/五金件'],
        branch: 'dev/T2',
      }),
    ).toEqual([])
  })

  it('requires a branch before synchronization', () => {
    expect(
      validateGitLabSyncDraft({
        message: '同步机械图纸',
        changePaths: ['charge.json'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        branch: '',
      }),
    ).toContain('请选择工作版本')
  })

  it('requires an assignee and a reviewer when creating an MR', () => {
    expect(
      validateMergeRequestDraft({
        sourceBranch: 'dev/T2',
        targetBranch: 'main',
        title: '提交 BOM 交付包',
        description: '',
        reviewerIds: [],
        feishuLinks: [],
        attachmentMarkdown: [],
      }),
    ).toEqual(['至少选择一位经办人', '至少选择一位审核人'])
  })

  it('requires a complete version Tag only when Tag creation is selected', () => {
    expect(
      validateGitLabSyncDraft({
        message: '同步机械图纸',
        changePaths: ['charge.json'],
        confirmedDeletions: [],
        selectedPackageIds: [],
        branch: 'dev/T2',
        tag: { name: 'T2-v1', message: '' },
      }),
    ).toContain('请填写交付标签说明')
  })

  it('accepts secure document links from the service used by the company', () => {
    expect(
      validateMergeRequestDraft({
        sourceBranch: 'dev/T2',
        targetBranch: 'main',
        title: '提交 BOM 交付包',
        description: '',
        assigneeIds: [7],
        reviewerIds: [42],
        feishuLinks: ['https://example.com/not-feishu'],
        attachmentMarkdown: [],
      }),
    ).toEqual([])
  })

  it('rejects insecure document links', () => {
    expect(
      validateMergeRequestDraft({
        sourceBranch: 'dev/T2',
        targetBranch: 'main',
        title: '提交 BOM 交付包',
        description: '',
        assigneeIds: [7],
        reviewerIds: [42],
        feishuLinks: ['http://example.com/document'],
        attachmentMarkdown: [],
      }),
    ).toContain('请填写有效的飞书云文档链接')
  })
})
