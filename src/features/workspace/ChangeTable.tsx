import { FileBox, FileJson2, FileText } from 'lucide-react'
import type { WorkingTreeChange } from '../../domain/repository'

interface ChangeTableProps {
  changes: WorkingTreeChange[]
  selectedIds: Set<string>
  onToggle: (id: string) => void
}

const kindLabels: Record<WorkingTreeChange['kind'], string> = {
  modified: '已修改',
  added: '新增',
  deleted: '已删除',
  untracked: '新增',
}

function ChangeIcon({ change }: { change: WorkingTreeChange }) {
  if (change.name.endsWith('.json')) return <FileJson2 size={18} />
  if (change.isCad) return <FileBox size={18} />
  return <FileText size={18} />
}

export function ChangeTable({
  changes,
  selectedIds,
  onToggle,
}: ChangeTableProps) {
  return (
    <div className="change-table">
      <div className="change-table__header" role="row">
        <span aria-hidden="true" />
        <span>文件</span>
        <span>状态</span>
        <span>大文件管理</span>
        <span>大小</span>
      </div>
      {changes.map((change) => {
        const isSelected = selectedIds.has(change.id)
        const needsDeletionConfirmation = change.kind === 'deleted' && change.isCad

        return (
          <div
            className={`change-row ${needsDeletionConfirmation ? 'change-row--danger' : ''}`}
            key={change.id}
            role="row"
          >
            <label className="check-control">
              <input
                checked={isSelected}
                onChange={() => onToggle(change.id)}
                type="checkbox"
              />
              <span className="sr-only">选择 {change.name}</span>
            </label>
            <div className="change-row__file">
              <span className="change-row__file-icon" aria-hidden="true">
                <ChangeIcon change={change} />
              </span>
              <div>
                <strong>{change.name}</strong>
                <span>{change.path}</span>
                <small>{change.fileType}</small>
              </div>
            </div>
            <div>
              <span className={`file-state file-state--${change.kind}`}>
                {kindLabels[change.kind]}
              </span>
            </div>
            <div>
              <span className={change.lfsTracked ? 'lfs-ok' : 'lfs-note'}>
                {change.lfsTracked ? '已管理' : '普通文件'}
              </span>
            </div>
            <div className="change-row__size">{change.size}</div>

          </div>
        )
      })}
    </div>
  )
}
