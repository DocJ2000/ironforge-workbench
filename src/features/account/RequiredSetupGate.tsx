import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { credentialClient } from '../../data/credentialClient'
import { organizationClient } from '../../data/organizationClient'

const computerAccountId = 'computer'

export function RequiredSetupGate() {
  const desktopStorage = credentialClient.available()
  const [state, setState] = useState<'checking' | 'ready' | 'missing'>(
    desktopStorage ? 'checking' : 'ready',
  )

  useEffect(() => {
    if (!desktopStorage) {
      setState('ready')
      return
    }

    const organizationReady = Boolean(organizationClient.load().gitlabUrl)
    void credentialClient
      .status(computerAccountId)
      .then((status) =>
        setState(organizationReady && status.configured ? 'ready' : 'missing'),
      )
      .catch(() => setState('missing'))
  }, [desktopStorage])

  if (state === 'ready') return <Outlet />
  if (state === 'missing') {
    return <Navigate replace state={{ setupRequired: true }} to="/account" />
  }

  return (
    <div className="task-page">
      <section className="wizard-panel blocking-notice">
        <h2>正在检查首次使用设置</h2>
        <p>马上就好，不会修改任何项目文件。</p>
      </section>
    </div>
  )
}
