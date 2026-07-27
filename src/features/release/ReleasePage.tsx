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
          <p className="eyebrow">管理员审核</p>
          <h1>准备铁炉堡交付</h1>
          <p className="page-header__path">
            从交付图纸文件夹选择内容，通过管理员审核后才会发布。
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
              添加交付图纸文件夹
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
                <strong>位于交付图纸文件夹</strong>
                <code>{selectedPackage?.path}</code>
              </span>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={16} />
              <span>
                <strong>项目发布规则符合要求</strong>
                <small>允许发布机械交付图纸</small>
              </span>
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={16} />
              <span>
                <strong>铁炉堡交付清单已更新</strong>
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
          <p className="eyebrow">必须经过管理员审核</p>
          <h2>等待管理员检查并批准</h2>
          <p>
            创建管理员审核单后，审核人会在公司项目服务器查看。管理员批准并放入正式版本后，
            系统才会开始发布到铁炉堡。
          </p>
        </div>
        <div className="approval-gate__flow">
          <span>
            <GitMerge aria-hidden="true" size={17} />
            审核单 #{repository.mergeRequest.id}
          </span>
          <strong>→</strong>
          <span className="approval-gate__pending">
            <ExternalLink aria-hidden="true" size={17} />
            铁炉堡尚未开始发布
          </span>
        </div>
      </section>
    </div>
  )
}
