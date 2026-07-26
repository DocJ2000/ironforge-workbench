import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { credentialClient } from '../../data/credentialClient'

interface Props {
  children: ReactNode
  projectId: string
}

export function CredentialGate({ children, projectId }: Props) {
  const desktopStorage = credentialClient.available()
  const [state, setState] = useState<'checking' | 'ready' | 'missing'>(
    desktopStorage ? 'checking' : 'ready',
  )

  useEffect(() => {
    if (!desktopStorage) {
      setState('ready')
      return
    }
    setState('checking')
    void credentialClient
      .status(projectId)
      .then((status) => setState(status.configured ? 'ready' : 'missing'))
      .catch(() => setState('missing'))
  }, [desktopStorage, projectId])

  if (state === 'ready') return children
  if (state === 'checking') {
    return (
      <div className="task-page">
        <section className="wizard-panel blocking-notice">
          <h2>正在检查项目连接</h2>
          <p>正在确认这个项目使用的 GitLab 账户和 SSH Key。</p>
        </section>
      </div>
    )
  }
  return (
    <div className="task-page">
      <section className="wizard-panel blocking-notice">
        <h2>先连接这个项目</h2>
        <p>上传文件前，需要为当前项目保存 GitLab Token 和 SSH 私钥。每个项目可以使用不同的 SSH Key。</p>
        <Link className="button button--primary" to="/account">去设置连接</Link>
      </section>
    </div>
  )
}
