import { expect, it } from 'vitest'
import { getDemoRepository } from '../data/demoRepository'
import { summarizeProjectStatus } from './projectStatus'

it('prioritizes server updates over local changes', () => {
  expect(summarizeProjectStatus({ ...getDemoRepository(), behind: 2 }).label).toBe('公司服务器有新内容')
})
