import { PackageCheck, X } from 'lucide-react'

interface IronforgePublishDialogProps {
  busy: boolean
  comment: string
  packageCount: number
  onCancel: () => void
  onCommentChange: (value: string) => void
  onConfirm: () => void
}

export function IronforgePublishDialog({
  busy,
  comment,
  packageCount,
  onCancel,
  onCommentChange,
  onConfirm,
}: IronforgePublishDialogProps) {
  return (
    <div className="delivery-dialog-backdrop">
      <section
        aria-labelledby="ironforge-publish-title"
        aria-modal="true"
        className="delivery-dialog"
        role="dialog"
      >
        <header>
          <span className="delivery-dialog__icon">
            <PackageCheck aria-hidden="true" size={20} />
          </span>
          <div>
            <span className="delivery-kicker">发布确认</span>
            <h2 id="ironforge-publish-title">确认发布到 Ironforge</h2>
          </div>
          <button
            aria-label="关闭发布确认"
            className="delivery-icon-button"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="publish-package-summary">
          将发布 <strong>{packageCount}</strong> 个已审核的 output 交付包
        </div>
        <label className="delivery-field">
          <span>发布注释</span>
          <textarea
            aria-label="发布注释"
            autoFocus
            onChange={(event) => onCommentChange(event.target.value)}
            placeholder="例如：发布本轮采购交付包"
            rows={4}
            value={comment}
          />
          <small>这段内容会单独写入 Ironforge 发布记录。</small>
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
            disabled={busy || !comment.trim() || packageCount === 0}
            onClick={onConfirm}
            type="button"
          >
            {busy ? '正在发布' : '确认发布'}
          </button>
        </footer>
      </section>
    </div>
  )
}
