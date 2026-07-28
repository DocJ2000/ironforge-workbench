interface UploadReceipt {
  branch: string
  commit: string
  createdAt: string
}

const prefix = 'ironforge-workbench:gitlab-upload:'

export const uploadReceiptClient = {
  load(repositoryId: string): UploadReceipt | null {
    try {
      const value = localStorage.getItem(`${prefix}${repositoryId}`)
      if (!value) return null
      const parsed = JSON.parse(value) as Partial<UploadReceipt>
      return (
        typeof parsed.branch === 'string'
        && parsed.branch.length > 0
        && typeof parsed.commit === 'string'
        && /^[0-9a-f]{7,64}$/i.test(parsed.commit)
        && typeof parsed.createdAt === 'string'
        && !Number.isNaN(Date.parse(parsed.createdAt))
      )
        ? parsed as UploadReceipt
        : null
    } catch {
      return null
    }
  },

  save(repositoryId: string, receipt: Omit<UploadReceipt, 'createdAt'>) {
    localStorage.setItem(`${prefix}${repositoryId}`, JSON.stringify({
      ...receipt,
      createdAt: new Date().toISOString(),
    } satisfies UploadReceipt))
  },
}
