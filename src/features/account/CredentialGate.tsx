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
          <h2>正在检查电脑连接</h2>
          <p>正在确认这台电脑能否连接公司项目服务器。</p>
        </section>
      </div>
    )
  }
  return (
    <div className="task-page">
      <section className="wizard-panel blocking-notice">
        <h2>先连接这台电脑</h2>
        <p>只需完成一次三步连接设置，之后这台电脑上的所有项目都可以使用。</p>
        <Link className="button button--primary" to="/account">去设置连接</Link>
      </section>
    </div>
  )
}
