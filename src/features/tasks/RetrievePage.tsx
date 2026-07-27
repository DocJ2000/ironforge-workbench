import { CheckCircle2, CloudDownload, FolderOpen, GitBranch } from 'lucide-react'
import { useState } from 'react'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import type { FriendlyError } from '../../domain/connection'
import type { RepositorySnapshot } from '../../domain/repository'
import { FriendlyErrorNotice } from '../errors/FriendlyErrorNotice'
import { GuidedWorkflow } from './GuidedWorkflow'
import './retrieve.css'

interface Props {
  repository: RepositorySnapshot
  api?: DeliveryApi
  onRefresh?: () => Promise<void>
}

export function RetrievePage({ repository, api = deliveryApi, onRefresh }: Props) {
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [result, setResult] = useState<{ updated: boolean; receivedCommits: number } | null>(null)

  async function retrieve() {
    setBusy(true)
    setError(null)
    try {
      setResult(await api.pull())
      await onRefresh?.()
    } catch (cause) {
      setError(friendlyErrorFrom(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <GuidedWorkflow
      currentStep={step}
      description="把同事上传到公司服务器的新内容更新到当前项目。"
      nextDisabled={busy}
      nextLabel={step === 0 ? '下一步' : busy ? '正在下载' : '确认下载'}
      onBack={step === 1 && !result ? () => setStep(0) : undefined}
      onNext={result ? undefined : step === 0 ? () => setStep(1) : () => void retrieve()}
      steps={['核对项目', '确认下载']}
      title="下载服务器内容"
    >
      {error ? <FriendlyErrorNotice error={error} /> : null}
      {result ? (
        <div className="wizard-success">
          <CheckCircle2 size={42} />
          <h2>{result.updated ? '已下载同事上传的新内容' : '这台电脑已经是最新版'}</h2>
          <p>{result.updated ? `本次收到 ${result.receivedCommits} 个新版本。` : '公司服务器没有比这台电脑更新的内容。'}</p>
        </div>
      ) : null}
      {!result && step === 0 ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>确认当前项目</h2>
            <p>这里只更新刚才选择的项目，不会影响其他项目。</p>
          </div>
          <dl className="confirm-list">
            <div><dt>项目</dt><dd>{repository.displayName}</dd></div>
            <div><dt><FolderOpen size={16} />这台电脑上的位置</dt><dd>{repository.path}</dd></div>
            <div><dt><GitBranch size={16} />当前工作版本</dt><dd>{repository.branch}</dd></div>
          </dl>
        </div>
      ) : null}
      {!result && step === 1 ? (
        <div>
          <div className="wizard-panel__intro">
            <h2>准备下载</h2>
            <p>软件会先检查公司服务器，只把缺少的新内容下载到当前项目。</p>
          </div>
          <div className="download-confirmation">
            <CloudDownload size={28} />
            <span><strong>{repository.displayName}</strong><small>不会删除其他项目，也不会上传本机文件。</small></span>
          </div>
        </div>
      ) : null}
    </GuidedWorkflow>
  )
}
