import { beforeEach, describe, expect, it } from 'vitest'
import { attachmentUploadReceiptClient } from './attachmentUploadReceiptClient'

describe('attachmentUploadReceiptClient', () => {
  beforeEach(() => localStorage.clear())

  it('reuses an uploaded attachment after the page is reopened', () => {
    const file = new File(['drawing'], 'drawing.pdf', {
      type: 'application/pdf',
      lastModified: 123,
    })

    attachmentUploadReceiptClient.save('project-1', file, '[drawing](/uploads/1)')

    expect(attachmentUploadReceiptClient.load('project-1', file)).toBe(
      '[drawing](/uploads/1)',
    )
    expect(
      attachmentUploadReceiptClient.load('project-2', file),
    ).toBeNull()
  })
})
