import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { FriendlyErrorNotice } from './FriendlyErrorNotice'

it('shows file safety and keeps technical detail collapsed', () => {
  render(<FriendlyErrorNotice error={{ code: 'x', title: '没有完成', detail: '连接失败', filesSafe: true, nextAction: '重新连接', technicalSummary: 'detail' }} />)
  expect(screen.getByText('你的本地文件没有改变。')).toBeVisible()
  expect(screen.getByText('detail')).not.toBeVisible()
})
