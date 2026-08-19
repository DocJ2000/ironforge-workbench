import { Download, ExternalLink, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { updateClient, type UpdateStatus } from '../../data/updateClient'
import { notificationClient } from '../../data/notificationClient'

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
  const projectUrl = 'https://github.com/DocJ2000/ironforge-workbench'
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

  async function downloadUpdate() {
    setBusy(true)
    setStatus((current) => ({
      phase: 'downloading',
      currentVersion: current?.currentVersion ?? '未知',
      availableVersion: current?.availableVersion,
      progress: 0,
    }))
    const timer = window.setInterval(() => {
      void client.status().then((next) => {
        if (next.phase === 'downloading' || next.phase === 'ready' || next.phase === 'error') {
          setStatus(next)
        }
      }).catch(() => {
        // The active download call remains authoritative.
      })
    }, 500)
    try {
      const next = await client.download()
      setStatus(next)
      if (next.phase === 'ready') {
        void notificationClient.show('新版本已经下载完成', '返回软件，点击“重启并安装”即可完成更新。')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '下载没有完成，请稍后重试'
      setStatus((current) => ({
        phase: 'error',
        currentVersion: current?.currentVersion ?? '未知',
        message,
      }))
      void notificationClient.show('新版本下载失败', message)
    } finally {
      window.clearInterval(timer)
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
        {status?.phase === 'downloading' ? (
          <div className="update-download-progress">
            <progress aria-label="新版本下载进度" max="100" value={status.progress ?? 0} />
            <span>正在下载 {status.progress ?? 0}%</span>
            <small>可以继续查看其他页面，下载完成后软件会提醒你。</small>
          </div>
        ) : null}
        {status?.phase === 'available' && status.releases?.length ? (
          <section className="update-release-notes">
            <strong>这次更新了什么</strong>
            {status.releases.length > 1 ? <p>本次将跨 {status.releases.length} 个版本更新，一次安装即可完成。</p> : null}
            {status.releases.map((release, index) => (
              <details key={release.version} open={index === 0}>
                <summary>版本 {release.version}</summary>
                <ul>
                  {release.notes.map((note) => <li key={note}>{note}</li>)}
                </ul>
              </details>
            ))}
          </section>
        ) : null}
        {status?.phase === 'available' && !status.releases?.length ? (
          <p className="update-release-notes__missing">暂时没拿到完整更新说明，但仍可以正常下载安装。</p>
        ) : null}
      </div>
      <footer className="software-update-panel__footer">
        <a
          className="button button--secondary software-update-panel__link"
          href={projectUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={17} />
          GitHub 项目
        </a>
        {status?.phase === 'available' ? (
          <button
            className="button button--primary"
            disabled={busy}
            onClick={() => void downloadUpdate()}
            type="button"
          >
            <Download size={17} />
            下载新版本
          </button>
        ) : status?.phase === 'downloading' ? (
          <button className="button button--primary" disabled type="button">
            <Download size={17} />
            正在下载 {status.progress ?? 0}%
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
