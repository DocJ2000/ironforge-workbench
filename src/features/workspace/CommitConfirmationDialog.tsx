import { AlertTriangle, GitCommitHorizontal, X } from 'lucide-react'
import type { CommitPreview } from '../../data/commitClient'

interface CommitConfirmationDialogProps {
  preview: CommitPreview
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CommitConfirmationDialog({
  preview,
  busy,
  onCancel,
  onConfirm,
}: CommitConfirmationDialogProps) {
  return (
    <div className="commit-dialog-backdrop">
      <section
        aria-labelledby="commit-dialog-title"
        aria-modal="true"
        className="commit-dialog"
        role="dialog"
      >
        <header>
          <span aria-hidden="true">
            <GitCommitHorizontal size={20} />
          </span>
          <div>
            <p className="eyebrow">最终确认</p>
            <h2 id="commit-dialog-title">确认本地 Commit</h2>
          </div>
          <button
            aria-label="关闭 Commit 预览"
            className="icon-button-light"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <X size={17} />
          </button>
        </header>

        <dl className="commit-dialog__summary">
          <div>
            <dt>分支</dt>
            <dd>{preview.branch}</dd>
          </div>
          <div>
            <dt>文件</dt>
            <dd>{preview.paths.length} 个</dd>
          </div>
        </dl>

        <div className="commit-dialog__message">
          <span>提交说明</span>
          <strong>{preview.message}</strong>
        </div>

        <ul className="commit-dialog__files">
          {preview.paths.slice(0, 8).map((path) => (
            <li key={path}>{path}</li>
          ))}
          {preview.paths.length > 8 ? <li>另有 {preview.paths.length - 8} 个文件</li> : null}
        </ul>

        {preview.deletedCadPaths.length ? (
          <div className="commit-dialog__warning">
            <AlertTriangle size={16} />
            包含 {preview.deletedCadPaths.length} 个已确认删除的 CAD 文件
          </div>
        ) : null}

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
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? '正在保存' : '确认本地 Commit'}
          </button>
        </footer>
      </section>
    </div>
  )
}
