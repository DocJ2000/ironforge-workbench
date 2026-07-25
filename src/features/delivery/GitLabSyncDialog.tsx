import { GitPullRequest, X } from 'lucide-react'

interface GitLabSyncDialogProps {
  branch: string
  busy: boolean
  comment: string
  fileCount: number
  onCancel: () => void
  onCommentChange: (value: string) => void
  onConfirm: () => void
}

export function GitLabSyncDialog({
  branch,
  busy,
  comment,
  fileCount,
  onCancel,
  onCommentChange,
  onConfirm,
}: GitLabSyncDialogProps) {
  return (
    <div className="delivery-dialog-backdrop">
      <section
        aria-labelledby="gitlab-sync-title"
        aria-modal="true"
        className="delivery-dialog"
        role="dialog"
      >
        <header>
          <span className="delivery-dialog__icon">
            <GitPullRequest aria-hidden="true" size={20} />
          </span>
          <div>
            <span className="delivery-kicker">最后确认</span>
            <h2 id="gitlab-sync-title">确认同步到 GitLab</h2>
          </div>
          <button
            aria-label="关闭同步确认"
            className="delivery-icon-button"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <dl className="sync-summary">
          <div>
            <dt>分支</dt>
            <dd>{branch}</dd>
          </div>
          <div>
            <dt>文件</dt>
            <dd>{fileCount} 个</dd>
          </div>
        </dl>
        <label className="delivery-field">
          <span>同步注释</span>
          <textarea
            aria-label="同步注释"
            autoFocus
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="例如：提交所有的BOM交付包"
            rows={4}
            value={comment}
          />
          <small>这段内容会成为本次 Git Commit 的说明。</small>
        </label>
        <footer>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            返回检查
          </button>
          <button
            className="button button--primary"
            disabled={busy || !comment.trim()}
            onClick={onConfirm}
            type="button"
          >
            {busy ? '正在同步' : '确认同步到 GitLab'}
          </button>
        </footer>
      </section>
    </div>
  )
}
