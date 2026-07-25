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

export interface IronforgePublishDraft {
  mergeRequestIid: number
  packageIds: string[]
  comment: string
}

export interface IronforgePublishResult {
  jobId: string
  packageCount: number
}

export function validateDeliveryDraft(draft: DeliveryDraft) {
  const errors: string[] = []

  if (!draft.changePaths.length) errors.push('没有需要提交的文件')
  if (!draft.message.trim()) errors.push('请填写本次改动说明')
  if (!draft.mrTitle.trim()) errors.push('请填写 MR 标题')
  if (!draft.reviewerIds.length) errors.push('至少选择一位审核人')
  if (!draft.targetBranch.trim()) errors.push('请选择目标分支')

  return errors
}
