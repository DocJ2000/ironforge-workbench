import type { BranchSummary, RepositorySnapshot } from '../src/domain/repository.js'

export function branchStage(name: string) {
  if (name === 'main' || name === 'master') return '正式主线'
  const stage = name.match(/(?:^|\/)(T\d+)$/i)?.[1]
  return stage ? `${stage.toUpperCase()} 设计` : '开发分支'
}

/**
 * Merge the cloud branch list from the GitLab API into the locally scanned
 * branches, so a branch created on the GitLab website shows up before the next
 * local fetch.
 */
export function mergeCloudBranches(
  repository: RepositorySnapshot,
  cloudBranches: Array<{
    name: string
    commitId: string
    shortId: string
    title: string
    committedAt: string
  }>,
): BranchSummary[] {
  const branches = new Map(repository.branches.map((branch) => [
    branch.name,
    branch,
  ]))
  for (const branch of cloudBranches) {
    const existing = branches.get(branch.name)
    branches.set(branch.name, {
      name: branch.name,
      stage: existing?.stage ?? branchStage(branch.name),
      commit: branch.shortId,
      commitMessage: branch.title,
      updatedAt: branch.committedAt,
      remote: true,
      current: existing?.current ?? repository.branch === branch.name,
    })
  }
  return [...branches.values()]
}
