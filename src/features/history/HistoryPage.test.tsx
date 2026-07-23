import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { HistoryPage } from './HistoryPage'

describe('HistoryPage', () => {
  it('links a release to commit, MR, and Ironforge job', () => {
    render(<HistoryPage repository={getDemoRepository()} />)

    expect(screen.getAllByText('879e5bf')[0]).toBeVisible()
    expect(screen.getAllByText('MR !28')[0]).toBeVisible()
    expect(screen.getByText('Ironforge 尚未触发')).toBeVisible()
  })
})
