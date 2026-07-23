import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { ReleasePage } from './ReleasePage'

describe('ReleasePage', () => {
  it('shows GitLab merge as mandatory before Ironforge publication', () => {
    render(<ReleasePage repository={getDemoRepository()} />)

    expect(screen.getByText('等待管理员在 GitLab 审核并 Merge')).toBeVisible()
    expect(screen.getByText('Ironforge 尚未触发')).toBeVisible()
  })
})
