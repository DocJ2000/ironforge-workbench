import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  GitMerge,
  ShieldCheck,
} from 'lucide-react'
import { useState } from 'react'
import { StatusBadge } from '../../components/StatusBadge'
import type { RepositorySnapshot } from '../../domain/repository'
import { DeliveryPackageList } from './DeliveryPackageList'
import { ReleaseStepper } from './ReleaseStepper'
import './release.css'

interface ReleasePageProps {
  repository: RepositorySnapshot
}

export function ReleasePage({ repository }: ReleasePageProps) {
  const [selectedPackageId, setSelectedPackageId] = useState(
    repository.deliveryPackages[0]?.id ?? '',
  )
  const selectedPackage = repository.deliveryPackages.find(
    (item) => item.id === selectedPackageId,
  )

  return (
    <div className="page page--release">
      <header className="page-header">
        <div>
          <p className="eyebrow">Merge Request · 发布审核</p>
          <h1>准备 Ironforge 交付</h1>
          <p className="page-header__path">
            从 output 选择交付物，通过管理员审核后才会发布。
          </p>
        </div>
        <StatusBadge tone="warning">第 2 步：自动校验</StatusBadge>
      </header>

      <section className="release-progress">
        <ReleaseStepper />
      </section>

      <div className="release-layout">
        <section className="release-packages">
          <div className="section-heading">
            <div>
              <h2>本次交付包</h2>
              <p>一个文件夹对应一个供应商收到的压缩包。</p>
            </div>
            <button className="button button--secondary" type="button">
              添加 output 文件夹
            </button>
          </div>
          <DeliveryPackageList
            onSelect={setSelectedPackageId}
            packages={repository.deliveryPackages}
            selectedId={selectedPackageId}
          />
        </section>

        <aside className="release-validation">
          <div className="release-validation__title">
            <span aria-hidden="true">
              <FileCheck2 size={19} />
            </span>
            <div>
              <h2>发布前校验</h2>
              <p>{selectedPackage?.name}</p>
            </div>
          </div>

          <ul className="validation-list">
            <li>
              <CheckCircle2 aria-hidden="true" size={16} />
              <span>
                <strong>路径位于 output</strong>
                <code>{selectedPackage?.path}</code>
              </span>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={16} />
              <span>
                <strong>forge.json 匹配</strong>
                <small>允许发布 output/mechanical</small>
              </span>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={16} />
              <span>
                <strong>charge.json 已选择</strong>
                <small>本次只打包所选文件夹</small>
              </span>
            </li>
            <li className="validation-list__warning">
              <AlertTriangle aria-hidden="true" size={16} />
              <span>
                <strong>1 个文件需要确认版本</strong>
                <small>板框图包含 V2 与 V3 文件名</small>
              </span>
            </li>
          </ul>

          <button className="button button--primary release-validation__button" type="button">
            确认并继续
          </button>
        </aside>
      </div>

      <section className="approval-gate">
        <div className="approval-gate__icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <div>
          <p className="eyebrow">强制审核门槛</p>
          <h2>等待管理员在 GitLab 审核并 Merge</h2>
          <p>
            创建 MR 后，审核人会在 GitLab 查看并批准。只有点击 Merge
            合入正式主线后，CI 才会触发 Ironforge。
          </p>
        </div>
        <div className="approval-gate__flow">
          <span>
            <GitMerge aria-hidden="true" size={17} />
            MR !{repository.mergeRequest.id}
          </span>
          <strong>→</strong>
          <span className="approval-gate__pending">
            <ExternalLink aria-hidden="true" size={17} />
            Ironforge 尚未触发
          </span>
        </div>
      </section>
    </div>
  )
}
