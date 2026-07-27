import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { HistoryPage } from './HistoryPage'

describe('HistoryPage', () => {
  it('links saved work, approval, and publication records', () => {
    render(<HistoryPage repository={getDemoRepository()} />)

    expect(screen.getAllByText('879e5bf')[0]).toBeVisible()
    expect(screen.getAllByText('审核单 #28')[0]).toBeVisible()
    expect(screen.getByText('铁炉堡尚未开始发布')).toBeVisible()
  })
})
