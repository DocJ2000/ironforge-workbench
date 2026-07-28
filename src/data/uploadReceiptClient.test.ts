import { afterEach, expect, it } from 'vitest'
import { uploadReceiptClient } from './uploadReceiptClient'

afterEach(() => localStorage.clear())

it('rejects malformed local upload receipts', () => {
  localStorage.setItem('ironforge-workbench:gitlab-upload:project-one', '{}')
  expect(uploadReceiptClient.load('project-one')).toBeNull()
})

it('loads a receipt written by the upload workflow', () => {
  uploadReceiptClient.save('project-one', {
    branch: 'dev/T2',
    commit: 'abcdef123456',
  })
  expect(uploadReceiptClient.load('project-one')).toMatchObject({
    branch: 'dev/T2',
    commit: 'abcdef123456',
  })
})
