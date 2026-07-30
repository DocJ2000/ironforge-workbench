import { describe, expect, it } from 'vitest'
import { parseExternalHttpUrl } from './externalUrl'

describe('parseExternalHttpUrl', () => {
  it.each([
    'https://git.example.com/group/project',
    'http://delivery.example.test/projects',
  ])('accepts an HTTP page address: %s', (value) => {
    expect(parseExternalHttpUrl(value)?.toString()).toBe(value)
  })

  it.each([
    '',
    'not a url',
    'file:///C:/Windows/System32/calc.exe',
    'javascript:alert(1)',
    'git@git.example.com:group/project.git',
  ])('rejects an invalid or non-web address without throwing: %s', (value) => {
    expect(parseExternalHttpUrl(value)).toBeNull()
  })
})
