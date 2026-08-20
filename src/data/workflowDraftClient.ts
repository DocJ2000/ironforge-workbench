export interface UploadWorkflowDraft {
  step: number
  selectedPackageIds: string[]
  branch: string
  title: string
  description: string
}

export interface MergeRequestWorkflowDraft {
  step: number
  title: string
  description: string
  links: string[]
  sourceBranch?: string
  targetBranch?: string
  assigneeIds?: number[]
  reviewerIds: number[]
  attachmentNames?: string[]
  tagEnabled?: boolean
  tagName?: string
  tagMessage?: string
}

interface StoredDraft<T> {
  version: 1
  savedAt: string
  value: T
}

const prefix = 'ironforge-workbench:workflow:'

function key(kind: 'upload' | 'merge-request', projectId: string) {
  return `${prefix}${kind}:${projectId}`
}

function save<T>(storageKey: string, value: T) {
  localStorage.setItem(storageKey, JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    value,
  } satisfies StoredDraft<T>))
}

function load<T>(storageKey: string, valid: (value: unknown) => value is T) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? '') as Partial<StoredDraft<unknown>>
    return parsed.version === 1
      && typeof parsed.savedAt === 'string'
      && !Number.isNaN(Date.parse(parsed.savedAt))
      && valid(parsed.value)
      ? parsed.value
      : null
  } catch {
    return null
  }
}

function isUploadDraft(value: unknown): value is UploadWorkflowDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<UploadWorkflowDraft>
  return Number.isInteger(draft.step)
    && typeof draft.branch === 'string'
    && typeof draft.title === 'string'
    && typeof draft.description === 'string'
    && Array.isArray(draft.selectedPackageIds)
    && draft.selectedPackageIds.every((id) => typeof id === 'string')
}

function isMergeRequestDraft(value: unknown): value is MergeRequestWorkflowDraft {
  if (!value || typeof value !== 'object') return false
  const draft = value as Partial<MergeRequestWorkflowDraft>
  return Number.isInteger(draft.step)
    && typeof draft.title === 'string'
    && typeof draft.description === 'string'
    && Array.isArray(draft.links)
    && draft.links.every((link) => typeof link === 'string')
    && Array.isArray(draft.reviewerIds)
    && draft.reviewerIds.every((id) => Number.isInteger(id))
    && (
      draft.assigneeIds === undefined
      || (
        Array.isArray(draft.assigneeIds)
        && draft.assigneeIds.every((id) => Number.isInteger(id))
      )
    )
    && (draft.tagEnabled === undefined || typeof draft.tagEnabled === 'boolean')
    && (draft.tagName === undefined || typeof draft.tagName === 'string')
    && (draft.tagMessage === undefined || typeof draft.tagMessage === 'string')
    && (
      draft.attachmentNames === undefined
      || (
        Array.isArray(draft.attachmentNames)
        && draft.attachmentNames.every((name) => typeof name === 'string')
      )
    )
}

export const workflowDraftClient = {
  loadUpload: (projectId: string) =>
    load(key('upload', projectId), isUploadDraft),
  saveUpload: (projectId: string, value: UploadWorkflowDraft) =>
    save(key('upload', projectId), value),
  clearUpload: (projectId: string) =>
    localStorage.removeItem(key('upload', projectId)),
  loadMergeRequest: (projectId: string) =>
    load(key('merge-request', projectId), isMergeRequestDraft),
  saveMergeRequest: (projectId: string, value: MergeRequestWorkflowDraft) =>
    save(key('merge-request', projectId), value),
  clearMergeRequest: (projectId: string) =>
    localStorage.removeItem(key('merge-request', projectId)),
}
