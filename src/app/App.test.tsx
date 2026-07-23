import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the five engineer workflow destinations', () => {
    render(<App />)

    expect(screen.getByRole('link', { name: /项目概览/ })).toBeVisible()
    expect(screen.getByRole('link', { name: /工作区/ })).toBeVisible()
    expect(screen.getByRole('link', { name: /版本阶段/ })).toBeVisible()
    expect(screen.getByRole('link', { name: /发布审核/ })).toBeVisible()
    expect(screen.getByRole('link', { name: /历史记录/ })).toBeVisible()
  })
})
