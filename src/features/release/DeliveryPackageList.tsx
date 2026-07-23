import { AlertTriangle, CheckCircle2, ChevronRight, FileArchive } from 'lucide-react'
import type { DeliveryPackage } from '../../domain/repository'

interface DeliveryPackageListProps {
  packages: DeliveryPackage[]
  selectedId: string
  onSelect: (id: string) => void
}

export function DeliveryPackageList({
  packages,
  selectedId,
  onSelect,
}: DeliveryPackageListProps) {
  return (
    <div className="delivery-package-list">
      {packages.map((deliveryPackage) => (
        <button
          className={`delivery-package ${
            selectedId === deliveryPackage.id ? 'delivery-package--selected' : ''
          }`}
          key={deliveryPackage.id}
          onClick={() => onSelect(deliveryPackage.id)}
          type="button"
        >
          <span className="delivery-package__icon" aria-hidden="true">
            <FileArchive size={20} />
          </span>
          <span className="delivery-package__content">
            <strong>{deliveryPackage.name}</strong>
            <small>{deliveryPackage.supplier}</small>
            <code>{deliveryPackage.path}</code>
            <span>{deliveryPackage.files.length} 个文件</span>
          </span>
          <span
            className={`delivery-package__validation delivery-package__validation--${deliveryPackage.validation}`}
          >
            {deliveryPackage.validation === 'valid' ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertTriangle size={15} />
            )}
            {deliveryPackage.validation === 'valid' ? '校验通过' : '需要检查'}
          </span>
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      ))}
    </div>
  )
}
