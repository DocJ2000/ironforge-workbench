import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getDemoRepository } from '../../data/demoRepository'
import { StagesPage } from './StagesPage'

describe('StagesPage', () => {
  it('explains that a new stage initially shares its base commit', () => {
    render(<StagesPage repository={getDemoRepository()} />)

    expect(
      screen.getByText('新分支创建时会继承基础分支已经提交的文件'),
    ).toBeVisible()
  })
})
