import { ArrowLeft, CheckCircle2, FolderOpen } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deliveryApi, friendlyErrorFrom, type DeliveryApi } from '../../data/deliveryClient'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import type { FriendlyError } from '../../domain/connection'
import { FieldHelp } from '../account/FieldHelp'
import { FriendlyErrorNotice } from '../errors/FriendlyErrorNotice'
import './cloneProject.css'

export function CloneProjectPage({ api = deliveryApi, onRefresh }: { api?: DeliveryApi; onRefresh?: () => Promise<void> }) {
  const [remoteUrl, setRemoteUrl] = useState('')
  const [destination, setDestination] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<FriendlyError | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function clone() {
    setBusy(true)
    setError(null)
    try {
      const cloned = await api.clone({ remoteUrl: remoteUrl.trim(), destination: destination.trim() })
      setResult(cloned.project.path)
      await onRefresh?.()
    } catch (cause) {
      setError(friendlyErrorFrom(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="task-page clone-project-page">
      <Link className="project-actions__back" to="/workspace"><ArrowLeft size={17} />返回项目列表</Link>
      <header><span className="task-eyebrow">GitLab</span><h1>下载一个新项目</h1><p>适合新电脑，或者这台电脑上还没有这个项目。</p></header>
      <section className="clone-project-panel">
        {error ? <FriendlyErrorNotice error={error} /> : null}
        {result ? <div className="wizard-success"><CheckCircle2 size={42} /><h2>项目已经下载完成</h2><p>保存位置：{result}</p><Link className="button button--primary" to="/workspace">返回项目列表</Link></div> : null}
        {!result ? <>
          <label className="plain-field">
            <span className="field-label-row">项目的 SSH 地址<FieldHelp label="项目的 SSH 地址"><strong>从 GitLab 项目页面复制。</strong><ol><li>请先向管理员确认你有该项目权限。</li><li>打开 GitLab 中的项目。</li><li>点击“Code”，选择“SSH”。</li><li>复制以 git@ 开头、以 .git 结尾的地址。</li></ol></FieldHelp></span>
            <input aria-label="项目的 SSH 地址" onChange={(event) => setRemoteUrl(event.target.value)} placeholder="例如：git@gitlab.example.com:group/sample-project.git" value={remoteUrl} />
          </label>
          <label className="plain-field">
            <span className="field-label-row">下载到哪个文件夹<FieldHelp label="下载位置"><strong>选择一个新的空文件夹。</strong><p>不要选择另一个项目正在使用的文件夹。</p></FieldHelp></span>
            <span className="path-input"><input aria-label="新项目保存位置" onChange={(event) => setDestination(event.target.value)} placeholder="选择一个空文件夹" value={destination} />{desktopDialogClient.available() ? <button aria-label="选择新项目保存位置" onClick={() => void desktopDialogClient.chooseDirectory().then((path) => { if (path) setDestination(path) })} title="选择文件夹" type="button"><FolderOpen size={17} /></button> : null}</span>
          </label>
          <p className="clone-project-panel__notice">点击下载前只会检查填写内容；点击后才会从公司服务器获取文件。</p>
          <button className="button button--primary" disabled={!remoteUrl.trim() || !destination.trim() || busy} onClick={() => void clone()} type="button">{busy ? '正在下载' : '确认下载新项目'}</button>
        </> : null}
      </section>
    </div>
  )
}
