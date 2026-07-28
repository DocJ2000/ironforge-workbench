import { Download, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateClient, type UpdateStatus } from '../../data/updateClient'

interface UpdateClient {
  status: () => Promise<UpdateStatus>
  check: () => Promise<UpdateStatus>
  download: () => Promise<UpdateStatus>
  install: () => Promise<UpdateStatus>
}

const labels: Record<UpdateStatus['phase'], string> = {
  unavailable: '当前是网页预览，不能检查更新',
  idle: '已经可以检查新版本',
  checking: '正在检查新版本',
  available: '发现新版本',
  downloading: '正在下载新版本',
  ready: '新版本已经准备好',
  error: '本次更新没有完成',
}

export function SoftwareUpdatePanel({
  client = updateClient,
}: {
  client?: UpdateClient
}) {
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void client.status().then(setStatus)
  }, [client])

  async function run(action: () => Promise<UpdateStatus>) {
    setBusy(true)
    try {
      setStatus(await action())
    } catch (cause) {
      setStatus((current) => ({
        phase: 'error',
        currentVersion: current?.currentVersion ?? '未知',
        message: cause instanceof Error ? cause.message : '操作没有完成，请稍后重试',
      }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="connection-section software-update-panel">
      <header>
        <span className="connection-icon"><RefreshCw size={21} /></span>
        <div>
          <h2>软件更新</h2>
          <p>检查不会修改任何项目；安装前会自动备份软件设置。</p>
        </div>
      </header>
      <div className="connection-form">
        <strong>{status ? `当前版本 ${status.currentVersion}` : '正在读取版本'}</strong>
        <p>
          {status?.phase === 'available' && status.availableVersion
            ? `发现新版本 ${status.availableVersion}`
            : status?.phase === 'downloading'
              ? `已下载 ${status.progress ?? 0}%`
              : status?.message ?? (status ? labels[status.phase] : '请稍候')}
        </p>
      </div>
      <footer>
        {status?.phase === 'available' ? (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => void run(client.download)}
            type="button"
          >
            <Download size={17} />
            下载新版本
          </button>
        ) : status?.phase === 'ready' ? (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => void run(client.install)}
            type="button"
          >
            重启并安装
          </button>
        ) : (
          <button
            className="button button--secondary"
            disabled={busy || status?.phase === 'unavailable'}
            onClick={() => void run(client.check)}
            type="button"
          >
            <RefreshCw size={17} />
            {busy ? '正在检查，请稍候' : '检查新版本'}
          </button>
        )}
      </footer>
    </section>
  )
}
