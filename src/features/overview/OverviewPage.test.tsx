import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { OverviewPage } from './OverviewPage'

describe('OverviewPage', () => {
  it('shows business and Git terminology together', () => {
    render(<OverviewPage repository={getDemoRepository()} />)

    expect(screen.getAllByText('保存设计版本')[0]).toBeVisible()
    expect(screen.getAllByText('Commit')[0]).toBeVisible()
    expect(screen.getAllByText('提交审核')[0]).toBeVisible()
    expect(screen.getAllByText('Merge Request')[0]).toBeVisible()
  })
})
