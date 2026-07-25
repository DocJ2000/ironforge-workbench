import { ChevronRight, Package } from 'lucide-react'
import type { OutputPackageCandidate } from '../../domain/delivery'

interface PackageSelectorProps {
  packages: OutputPackageCandidate[]
  selectedIds: Set<string>
  onOpen: (item: OutputPackageCandidate) => void
  onToggle: (id: string) => void
}

export function PackageSelector({
  packages,
  selectedIds,
  onOpen,
  onToggle,
}: PackageSelectorProps) {
  return (
    <div className="package-grid">
      {packages.map((item) => (
        <div className="package-row" key={item.id}>
          <label>
            <input
              aria-label={`发布 ${item.name}`}
              checked={selectedIds.has(item.id)}
              onChange={() => onToggle(item.id)}
              type="checkbox"
            />
            <Package aria-hidden="true" size={17} />
            <span>
              <strong>{item.name}</strong>
              <small>
                {item.domain} · {item.files.length} 个文件
              </small>
            </span>
          </label>
          <button
            aria-label={`查看 ${item.name}`}
            className="delivery-icon-button"
            onClick={() => onOpen(item)}
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}
