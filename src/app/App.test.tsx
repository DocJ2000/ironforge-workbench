import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the simplified delivery navigation', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: '开始' })).toBeVisible()
    expect(screen.getByRole('link', { name: '历史记录' })).toBeVisible()
    expect(screen.queryByRole('link', { name: '版本阶段' })).not.toBeInTheDocument()
  })
})
