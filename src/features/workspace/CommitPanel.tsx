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
          <code>只保存在这台电脑</code>
        </div>
      </div>

      <div className="commit-panel__branch">
        <span>保存到工作版本</span>
        <code>{branch}</code>
      </div>

      <label className="field">
        <span>这次改了什么？</span>
        <textarea
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder="例如：调整示例零件结构"
          rows={5}
          value={commitMessage}
        />
        <small>这段说明会显示在项目的版本历史中。</small>
      </label>

      <div className="commit-panel__selection">
        <span>已选择</span>
        <strong>{selectedCount} 个文件</strong>
      </div>

      <div className="commit-panel__note">
        <Info aria-hidden="true" size={15} />
        <p>
          这一步只保存在当前电脑。稍后还要点击上传，公司项目服务器和同事才能看到。
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
