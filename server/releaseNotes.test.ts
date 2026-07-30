import { expect, it } from 'vitest'
import { extractReleaseNotes } from '../scripts/releaseNotes.mjs'

it('extracts only the requested version from the changelog', () => {
  const changelog = `# 更新记录

## 0.1.14

- 定期检查更新。
- 不会自动安装。

## 0.1.13

- 修复项目链接。
`

  expect(extractReleaseNotes(changelog, '0.1.14')).toBe(
    '## 0.1.14\n\n- 定期检查更新。\n- 不会自动安装。\n',
  )
})
