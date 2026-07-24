import { GitCommitHorizontal, Info, Save } from 'lucide-react'

interface CommitPanelProps {
  branch: string
  commitMessage: string
  selectedCount: number
  disabled: boolean
  onMessageChange: (value: string) => void
  onSubmit: () => void
  busy?: boolean
}

export function CommitPanel({
  branch,
  commitMessage,
  selectedCount,
  disabled,
  onMessageChange,
  onSubmit,
  busy = false,
}: CommitPanelProps) {
  return (
    <aside className="commit-panel">
      <div className="commit-panel__heading">
        <span aria-hidden="true">
          <GitCommitHorizontal size={19} />
        </span>
        <div>
          <h2>保存设计版本</h2>
          <code>git commit</code>
        </div>
      </div>

      <div className="commit-panel__branch">
        <span>保存到分支</span>
        <code>{branch}</code>
      </div>

      <label className="field">
        <span>这次改了什么？</span>
        <textarea
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="例如：调整场旋框盖结构，解决近焦遮挡问题"
          rows={5}
          value={commitMessage}
        />
        <small>提交说明会永久显示在 GitLab 的版本历史中。</small>
      </label>

      <div className="commit-panel__selection">
        <span>已选择</span>
        <strong>{selectedCount} 个文件</strong>
      </div>

      <div className="commit-panel__note">
        <Info aria-hidden="true" size={15} />
        <p>
          Commit 只保存到本地。完成后还需要 <strong>Push</strong>，GitLab
          才能看到。
        </p>
      </div>

      <button
        className="button button--primary commit-panel__submit"
        disabled={disabled || busy}
        onClick={onSubmit}
        type="button"
      >
        <Save aria-hidden="true" size={17} />
        {busy ? '正在检查' : '保存设计版本'}
      </button>
    </aside>
  )
}
