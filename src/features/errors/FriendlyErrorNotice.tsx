import type { FriendlyError } from '../../domain/connection'
import './friendlyErrorNotice.css'

export function FriendlyErrorNotice({ error }: { error: FriendlyError }) {
  return <section className="friendly-error" role="alert">
    <strong>{error.title}</strong><p>{error.detail}</p>
    {error.filesSafe ? <p className="friendly-error__safe">你的本地文件没有改变。</p> : null}
    <p><b>接下来：</b>{error.nextAction}</p>
    {error.technicalSummary ? <details><summary>给技术同事看的信息</summary><code>{error.technicalSummary}</code></details> : null}
  </section>
}
