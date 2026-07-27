export interface OutputPackageFile {
  name: string
  path: string
  type: string
  size: string
}

export interface OutputPackageCandidate {
  id: string
  name: string
  path: string
  domain: string
  files: OutputPackageFile[]
}

export type GitLabProjectRole =
  | 'Owner'
  | 'Maintainer'
  | 'Developer'
  | 'Reporter'
  | 'Guest'

export interface GitLabReviewer {
  id: number
  name: string
  username: string
  avatarUrl?: string
  role: GitLabProjectRole
  recommended: boolean
}

export interface DeliveryDraft {
  message: string
  changePaths: string[]
  confirmedDeletions: string[]
  selectedPackageIds: string[]
  reviewerIds: number[]
  targetBranch: string
  mrTitle: string
}

export interface GitLabSyncDraft {
  message: string
  changePaths: string[]
  confirmedDeletions: string[]
  selectedPackageIds: string[]
  branch: string
  tag?: {
    name: string
    message: string
  }
}

export interface GitLabSyncResult {
  commit: string
  branch: string
  tag?: string
}

export interface MergeRequestDraft {
  sourceBranch: string
  targetBranch: string
  title: string
  description: string
  reviewerIds: number[]
  feishuLinks: string[]
  attachmentMarkdown: string[]
}

export interface MergeRequestResult {
  iid: number
  webUrl: string
}

export interface DeliveryPreview {
  branch: string
  draft: DeliveryDraft
  chargeChanged: boolean
  chargeBefore: unknown
  chargeAfter: unknown
  selectedPackages: OutputPackageCandidate[]
}

export interface DeliveryExecutionResult {
  commit: string
  branch: string
  mergeRequestIid: number
  mergeRequestUrl: string
}

export function validateDeliveryDraft(draft: DeliveryDraft) {
  const errors: string[] = []

  if (!draft.changePaths.length) errors.push('没有需要提交的文件')
  if (!draft.message.trim()) errors.push('请填写本次改动说明')
  if (!draft.mrTitle.trim()) errors.push('请填写管理员审核单标题')
  if (!draft.reviewerIds.length) errors.push('至少选择一位审核人')
  if (!draft.targetBranch.trim()) errors.push('请选择要交付到的正式版本')

  return errors
}

export function validateGitLabSyncDraft(draft: GitLabSyncDraft) {
  const errors: string[] = []
  if (!draft.changePaths.length) errors.push('没有需要上传的文件')
  if (!draft.message.trim()) errors.push('请填写本次更新标题')
  if (!draft.branch.trim()) errors.push('请选择工作版本')
  if (draft.tag) {
    if (!draft.tag.name.trim()) errors.push('请填写本次交付标签')
    if (!draft.tag.message.trim()) errors.push('请填写交付标签说明')
  }
  return errors
}

export function validateMergeRequestDraft(draft: MergeRequestDraft) {
  const errors: string[] = []
  if (!draft.sourceBranch.trim()) errors.push('请选择要提交审核的工作版本')
  if (!draft.targetBranch.trim()) errors.push('请选择要交付到的正式版本')
  if (!draft.title.trim()) errors.push('请填写管理员审核单标题')
  if (!draft.reviewerIds.length) errors.push('至少选择一位审核人')
  if (
    draft.feishuLinks.some((link) => {
      try {
        return new URL(link).protocol !== 'https:'
      } catch {
        return true
      }
    })
  ) {
    errors.push('请填写有效的飞书云文档链接')
  }
  return errors
}
