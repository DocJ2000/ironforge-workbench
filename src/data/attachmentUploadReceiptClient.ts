interface AttachmentReceipt {
  markdown: string
  savedAt: string
}

const prefix = 'ironforge-workbench:attachment-upload:'

function key(projectId: string, file: File) {
  return `${prefix}${projectId}:${file.name}:${file.size}:${file.lastModified}`
}

export const attachmentUploadReceiptClient = {
  load(projectId: string, file: File) {
    try {
      const parsed = JSON.parse(
        localStorage.getItem(key(projectId, file)) ?? '',
      ) as Partial<AttachmentReceipt>
      return typeof parsed.markdown === 'string' ? parsed.markdown : null
    } catch {
      return null
    }
  },
  save(projectId: string, file: File, markdown: string) {
    localStorage.setItem(key(projectId, file), JSON.stringify({
      markdown,
      savedAt: new Date().toISOString(),
    } satisfies AttachmentReceipt))
  },
}
