export interface MergeRequestReceipt {
  iid: number
  webUrl: string
  sourceBranch: string
  sourceCommit: string
  state: 'opened' | 'closed' | 'merged'
  createdAt: string
}

const prefix = 'ironforge-workbench:merge-request:'

function key(projectId: string) {
  return `${prefix}${projectId}`
}

function valid(value: unknown): value is MergeRequestReceipt {
  if (!value || typeof value !== 'object') return false
  const receipt = value as Partial<MergeRequestReceipt>
  return Number.isInteger(receipt.iid)
    && Number(receipt.iid) > 0
    && typeof receipt.webUrl === 'string'
    && typeof receipt.sourceBranch === 'string'
    && typeof receipt.sourceCommit === 'string'
    && receipt.sourceCommit.length > 0
    && ['opened', 'closed', 'merged'].includes(receipt.state ?? '')
    && typeof receipt.createdAt === 'string'
    && !Number.isNaN(Date.parse(receipt.createdAt))
}

export const mergeRequestReceiptClient = {
  load(projectId: string) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key(projectId)) ?? '')
      return valid(parsed) ? parsed : null
    } catch {
      return null
    }
  },
  save(
    projectId: string,
    receipt: Omit<MergeRequestReceipt, 'createdAt'>,
  ) {
    localStorage.setItem(key(projectId), JSON.stringify({
      ...receipt,
      createdAt: new Date().toISOString(),
    } satisfies MergeRequestReceipt))
  },
  updateState(
    projectId: string,
    state: MergeRequestReceipt['state'],
  ) {
    const current = mergeRequestReceiptClient.load(projectId)
    if (!current) return
    localStorage.setItem(key(projectId), JSON.stringify({ ...current, state }))
  },
}
