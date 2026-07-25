import { GitPullRequest, X } from 'lucide-react'

interface GitLabSyncDialogProps {
  branch: string
  busy: boolean
  comment: string
  fileCount: number
  onCancel: () => void
  onCommentChange: (value: string) => void
  onConfirm: () => void
  tagEnabled: boolean
  tagFinal: boolean
  tagMessage: string
  tagName: string
  tagStage: string
  tagVersion: string
  onTagEnabledChange: (value: boolean) => void
  onTagFinalChange: (value: boolean) => void
  onTagMessageChange: (value: string) => void
  onTagStageChange: (value: string) => void
  onTagVersionChange: (value: string) => void
}

export function GitLabSyncDialog({
  branch,
  busy,
  comment,
  fileCount,
  onCancel,
  onCommentChange,
  onConfirm,
  tagEnabled,
  tagFinal,
  tagMessage,
  tagName,
  tagStage,
  tagVersion,
  onTagEnabledChange,
  onTagFinalChange,
  onTagMessageChange,
  onTagStageChange,
  onTagVersionChange,
}: GitLabSyncDialogProps) {
  const tagComplete = !tagEnabled || (tagName.trim() && tagMessage.trim())
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
        <div className="tag-editor">
          <label className="delivery-check-row">
            <input
              checked={tagEnabled}
              onChange={(event) => onTagEnabledChange(event.target.checked)}
              type="checkbox"
            />
            <span>保存为版本 Tag</span>
          </label>
          {tagEnabled ? (
            <div className="tag-editor__fields">
              <label className="delivery-field">
                <span>阶段</span>
                <select
                  aria-label="Tag 阶段"
                  onChange={(event) => onTagStageChange(event.target.value)}
                  value={tagStage}
                >
                  <option value="T0">T0</option>
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
              {tagStage === 'custom' ? (
                <label className="delivery-field">
                  <span>自定义 Tag</span>
                  <input
                    aria-label="自定义 Tag"
                    onChange={(event) => onTagVersionChange(event.target.value)}
                    placeholder="例如：T2-修模-v1"
                    value={tagVersion}
                  />
                </label>
              ) : (
                <>
                  <label className="delivery-field">
                    <span>版本</span>
                    <input
                      aria-label="Tag 版本"
                      disabled={tagFinal}
                      onChange={(event) => onTagVersionChange(event.target.value)}
                      placeholder="v1"
                      value={tagVersion}
                    />
                  </label>
                  <label className="delivery-check-row delivery-check-row--compact">
                    <input
                      checked={tagFinal}
                      onChange={(event) => onTagFinalChange(event.target.checked)}
                      type="checkbox"
                    />
                    <span>这是最终版</span>
                  </label>
                </>
              )}
              <label className="delivery-field tag-editor__message">
                <span>Tag 说明</span>
                <input
                  aria-label="Tag 说明"
                  onChange={(event) => onTagMessageChange(event.target.value)}
                  placeholder="例如：Dragon T2 第一版交付存档"
                  value={tagMessage}
                />
              </label>
              <div className="tag-preview">
                将创建：<strong>{tagName || '请填写 Tag'}</strong>
              </div>
            </div>
          ) : null}
        </div>
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
            disabled={busy || !comment.trim() || !tagComplete}
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
