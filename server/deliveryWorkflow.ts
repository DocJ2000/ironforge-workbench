import type {
  DeliveryDraft,
  DeliveryPreview,
  GitLabSyncDraft,
  GitLabSyncResult,
  MergeRequestDraft,
  MergeRequestResult,
  OutputPackageCandidate,
} from '../src/domain/delivery.js'
import {
  validateDeliveryDraft,
  validateGitLabSyncDraft,
  validateMergeRequestDraft,
} from '../src/domain/delivery.js'
import type { ChargePreview } from './chargeGenerator.js'
import type {
  CreatedMergeRequest,
  CreateMergeRequestInput,
} from './gitlabClient.js'
import type {
  RepositoryCommitPreview,
  RepositoryCommitRequest,
} from './repositoryCommit.js'
import { inspectUploadRisks } from './projectRiskService.js'

interface RepositoryIdentity {
  branch: string
  gitlabPath: string
  behind?: number
}

interface CommitResult {
  branch: string
  commit: string
  paths: string[]
}

export interface DeliveryWorkflowDependencies {
  scanRepository: (repositoryPath: string) => Promise<RepositoryIdentity>
  scanPackages: (repositoryPath: string) => Promise<OutputPackageCandidate[]>
  previewCharge: (
    repositoryPath: string,
    candidates: OutputPackageCandidate[],
    selectedIds: string[],
  ) => Promise<ChargePreview>
  writeCharge: (
    repositoryPath: string,
    preview: ChargePreview,
  ) => Promise<void>
  previewCommit: (
    repositoryPath: string,
    request: RepositoryCommitRequest,
  ) => Promise<RepositoryCommitPreview>
  commit: (
    repositoryPath: string,
    request: RepositoryCommitRequest,
  ) => Promise<CommitResult>
  checkout: (repositoryPath: string, branch: string) => Promise<void>
  push: (repositoryPath: string, branch: string) => Promise<void>
  assertTagAvailable: (repositoryPath: string, name: string) => Promise<void>
  createTag: (
    repositoryPath: string,
    tag: { name: string; message: string },
    commit: string,
  ) => Promise<void>
  pushTag: (repositoryPath: string, name: string) => Promise<void>
  createMergeRequest: (
    input: CreateMergeRequestInput,
  ) => Promise<CreatedMergeRequest>
}

export interface ConfirmedRequest<T> {
  draft: T
  confirmed: boolean
}

function commitRequest(
  draft: GitLabSyncDraft,
  chargeChanged: boolean,
): RepositoryCommitRequest {
  return {
    message: draft.message,
    paths: [
      ...new Set([
        ...draft.changePaths,
        ...(chargeChanged ? ['charge.json'] : []),
      ]),
    ],
    confirmedDeletions: draft.confirmedDeletions,
  }
}

function assertValid(errors: string[]) {
  if (errors.length) throw new Error(errors.join('；'))
}

function assertConfirmed(confirmed: boolean, operation: string) {
  if (!confirmed) throw new Error(`请先确认${operation}`)
}

export async function previewDelivery(
  repositoryPath: string,
  draft: DeliveryDraft,
  dependencies: DeliveryWorkflowDependencies,
): Promise<DeliveryPreview> {
  assertValid(validateDeliveryDraft(draft))
  const [repository, packages] = await Promise.all([
    dependencies.scanRepository(repositoryPath),
    dependencies.scanPackages(repositoryPath),
  ])
  const charge = await dependencies.previewCharge(
    repositoryPath,
    packages,
    draft.selectedPackageIds,
  )
  const selectedPackageIds = new Set(draft.selectedPackageIds)

  return {
    branch: repository.branch,
    draft,
    chargeChanged: charge.changed,
    chargeBefore: charge.before,
    chargeAfter: charge.after,
    selectedPackages: packages.filter((item) =>
      selectedPackageIds.has(item.id),
    ),
  }
}

export async function syncGitLab(
  repositoryPath: string,
  request: ConfirmedRequest<GitLabSyncDraft>,
  dependencies: DeliveryWorkflowDependencies,
): Promise<GitLabSyncResult> {
  assertConfirmed(request.confirmed, '同步到 GitLab')
  const { draft } = request
  assertValid(validateGitLabSyncDraft(draft))
  const repository = await dependencies.scanRepository(repositoryPath)
  const risks = inspectUploadRisks(repository, draft)
  if (risks.length) throw new Error(risks.map((risk) => `${risk.title}：${risk.nextAction}`).join('；'))

  if (draft.tag) {
    await dependencies.assertTagAvailable(repositoryPath, draft.tag.name)
  }
  await dependencies.checkout(repositoryPath, draft.branch)
  const packages = await dependencies.scanPackages(repositoryPath)
  const charge = await dependencies.previewCharge(
    repositoryPath,
    packages,
    draft.selectedPackageIds,
  )
  await dependencies.writeCharge(repositoryPath, charge)

  const commitInput = commitRequest(draft, charge.changed)
  await dependencies.previewCommit(repositoryPath, commitInput)
  const commit = await dependencies.commit(repositoryPath, commitInput)
  await dependencies.push(repositoryPath, draft.branch)
  if (draft.tag) {
    await dependencies.createTag(repositoryPath, draft.tag, commit.commit)
    await dependencies.pushTag(repositoryPath, draft.tag.name)
  }

  return {
    commit: commit.commit,
    branch: draft.branch,
    ...(draft.tag ? { tag: draft.tag.name } : {}),
  }
}

export async function createDeliveryMergeRequest(
  repositoryPath: string,
  request: ConfirmedRequest<MergeRequestDraft>,
  dependencies: DeliveryWorkflowDependencies,
): Promise<MergeRequestResult> {
  assertConfirmed(request.confirmed, '创建 MR')
  const { draft } = request
  assertValid(validateMergeRequestDraft(draft))

  const repository = await dependencies.scanRepository(repositoryPath)
  const description = composeMergeRequestDescription(draft)
  const mergeRequest = await dependencies.createMergeRequest({
    projectPath: repository.gitlabPath,
    sourceBranch: draft.sourceBranch,
    targetBranch: draft.targetBranch,
    title: draft.title,
    description,
    reviewerIds: draft.reviewerIds,
  })

  return {
    iid: mergeRequest.iid,
    webUrl: mergeRequest.webUrl,
  }
}

export function composeMergeRequestDescription(draft: MergeRequestDraft) {
  const sections = [draft.description.trim()]
  if (draft.feishuLinks.length) {
    sections.push(
      `## 飞书文档\n${draft.feishuLinks.map((link) => `- ${link}`).join('\n')}`,
    )
  }
  if (draft.attachmentMarkdown.length) {
    sections.push(`## 附件\n${draft.attachmentMarkdown.join('\n')}`)
  }
  return sections.filter(Boolean).join('\n\n')
}
