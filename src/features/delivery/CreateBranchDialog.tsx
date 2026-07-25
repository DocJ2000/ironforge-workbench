import { X } from 'lucide-react'

interface CreateBranchDialogProps {
  branchName: string
  branches: string[]
  busy: boolean
  onBranchNameChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
  onStartPointChange: (value: string) => void
  startPoint: string
}

export function CreateBranchDialog({
  branchName,
  branches,
  busy,
  onBranchNameChange,
  onCancel,
  onConfirm,
  onStartPointChange,
  startPoint,
}: CreateBranchDialogProps) {
  return (
    <div className="delivery-modal-backdrop">
      <section
        aria-labelledby="create-branch-title"
        aria-modal="true"
        className="delivery-modal"
        role="dialog"
      >
        <header className="delivery-modal__header">
          <div>
            <span className="delivery-kicker">本地分支</span>
            <h2 id="create-branch-title">创建新分支</h2>
          </div>
          <button
            aria-label="关闭创建分支"
            className="delivery-icon-button"
            disabled={busy}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="delivery-modal__body">
          <label className="delivery-field">
            <span>新分支名称</span>
            <input
              aria-label="新分支名称"
              autoFocus
              onChange={(event) => onBranchNameChange(event.target.value)}
              placeholder="例如：dev/T3"
              value={branchName}
            />
          </label>
          <label className="delivery-field">
            <span>从这个分支创建</span>
            <select
              aria-label="新分支起点"
              onChange={(event) => onStartPointChange(event.target.value)}
              value={startPoint}
            >
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
          <p className="delivery-form-note">
            新分支先在本地创建，第一次同步到 GitLab 后才会出现在远端。
          </p>
        </div>
        <footer className="delivery-modal__actions">
          <button className="button button--secondary" onClick={onCancel} type="button">
            取消
          </button>
          <button
            className="button button--primary"
            disabled={busy || !branchName.trim()}
            onClick={onConfirm}
            type="button"
          >
            {busy ? '正在创建' : '创建并选中'}
          </button>
        </footer>
      </section>
    </div>
  )
}
