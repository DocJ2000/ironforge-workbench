import type { RepositorySnapshot } from '../../domain/repository'

export function uploadBranchNames(repository: RepositorySnapshot) {
  return repository.branches
    .filter((item) => item.remote && item.name.startsWith('dev/'))
    .map((item) => item.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
}

export function branchStartNames(repository: RepositorySnapshot) {
  return repository.branches
    .filter((item) => item.remote)
    .map((item) => item.name)
    .sort((left, right) => {
      if (left === 'main' || left === 'master') return -1
      if (right === 'main' || right === 'master') return 1
      return left.localeCompare(right, undefined, { numeric: true })
    })
}

export function initialUploadBranch(
  repository: RepositorySnapshot,
  branchNames = uploadBranchNames(repository),
) {
  if (branchNames.includes(repository.branch)) return repository.branch
  return branchNames
    .filter((name) => repository.branch.startsWith(name))
    .sort((left, right) => right.length - left.length)[0] ?? branchNames[0] ?? ''
}
