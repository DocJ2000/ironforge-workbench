import type {
  DeliveryDraft,
  DeliveryExecutionResult,
  DeliveryPreview,
  OutputPackageCandidate,
} from '../src/domain/delivery.js'
import { validateDeliveryDraft } from '../src/domain/delivery.js'
import type {
  RepositoryCommitPreview,
  RepositoryCommitRequest,
} from './repositoryCommit.js'
import type { ChargePreview } from './chargeGenerator.js'
import type {
  CreatedMergeRequest,
  CreateMergeRequestInput,
} from './gitlabClient.js'

interface RepositoryIdentity {
  branch: string
  gitlabPath: string
}

interface CommitResult {
  branch: string
  commit: string
  paths: string[]
}

export interface DeliveryWorkflowDependencies {
  scanRepository: (repositoryPath: string) => Promise<RepositoryIdentity>
  scanPackages: (
    repositoryPath: string,
  ) => Promise<OutputPackageCandidate[]>
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
  push: (repositoryPath: string, branch: string) => Promise<void>
  createMergeRequest: (
    input: CreateMergeRequestInput,
  ) => Promise<CreatedMergeRequest>
}

export interface ExecuteDeliveryRequest {
  draft: DeliveryDraft
  confirmed: boolean
}

function commitRequest(
  draft: DeliveryDraft,
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

function validate(draft: DeliveryDraft) {
  const errors = validateDeliveryDraft(draft)
  if (errors.length) throw new Error(errors.join('；'))
}

export async function previewDelivery(
  repositoryPath: string,
  draft: DeliveryDraft,
  dependencies: DeliveryWorkflowDependencies,
): Promise<DeliveryPreview> {
  validate(draft)
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

export async function executeDelivery(
  repositoryPath: string,
  request: ExecuteDeliveryRequest,
  dependencies: DeliveryWorkflowDependencies,
): Promise<DeliveryExecutionResult> {
  if (!request.confirmed) {
    throw new Error('请先确认 GitLab 同步操作')
  }

  const { draft } = request
  validate(draft)
  const [repository, packages] = await Promise.all([
    dependencies.scanRepository(repositoryPath),
    dependencies.scanPackages(repositoryPath),
  ])
  const charge = await dependencies.previewCharge(
    repositoryPath,
    packages,
    draft.selectedPackageIds,
  )
  await dependencies.writeCharge(repositoryPath, charge)

  const commitInput = commitRequest(draft, charge.changed)
  await dependencies.previewCommit(repositoryPath, commitInput)
  const commit = await dependencies.commit(repositoryPath, commitInput)
  await dependencies.push(repositoryPath, repository.branch)
  const mergeRequest = await dependencies.createMergeRequest({
    projectPath: repository.gitlabPath,
    sourceBranch: repository.branch,
    targetBranch: draft.targetBranch,
    title: draft.mrTitle,
    description: `同步注释：${draft.message}`,
    reviewerIds: draft.reviewerIds,
  })

  return {
    commit: commit.commit,
    branch: repository.branch,
    mergeRequestIid: mergeRequest.iid,
    mergeRequestUrl: mergeRequest.webUrl,
  }
}
