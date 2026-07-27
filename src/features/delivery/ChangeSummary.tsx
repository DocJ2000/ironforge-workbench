import { FileText, X } from 'lucide-react'
import type { WorkingTreeChange } from '../../domain/repository'

interface ChangeSummaryProps {
  changes: WorkingTreeChange[]
  onClose: () => void
}

export function ChangeSummary({ changes, onClose }: ChangeSummaryProps) {
  const groups = new Map<string, WorkingTreeChange[]>()
  for (const change of changes) {
    const group = change.path.split('/')[0]
    groups.set(group, [...(groups.get(group) ?? []), change])
  }

  return (
    <div className="delivery-drawer-backdrop">
      <aside
        aria-labelledby="change-summary-title"
        aria-modal="true"
        className="delivery-drawer"
        role="dialog"
      >
        <header className="delivery-drawer__header">
          <div>
            <span className="delivery-kicker">只读核对</span>
            <h2 id="change-summary-title">本次上传文件</h2>
          </div>
          <button
            aria-label="关闭文件清单"
            className="delivery-icon-button"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="delivery-drawer__body">
          {[...groups.entries()].map(([group, files]) => (
            <section className="change-group" key={group}>
              <h3>
                {group}
                <span>{files.length}</span>
              </h3>
              <ul>
                {files.map((file) => (
                  <li key={file.id}>
                    <FileText aria-hidden="true" size={15} />
                    <span title={file.path}>{file.path}</span>
                    <small className={`change-kind change-kind--${file.kind}`}>
                      {file.kind}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </aside>
    </div>
  )
}
