import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { ReleasePage } from './ReleasePage'

describe('ReleasePage', () => {
  it('shows administrator approval as mandatory before publication', () => {
    render(<ReleasePage repository={getDemoRepository()} />)

    expect(screen.getByText('等待管理员检查并批准')).toBeVisible()
    expect(screen.getByText('铁炉堡尚未开始发布')).toBeVisible()
  })
})
