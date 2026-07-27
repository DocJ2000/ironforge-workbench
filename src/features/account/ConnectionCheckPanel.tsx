import { CheckCircle2, CircleDashed, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { ConnectionCheckResult } from '../../domain/connection'
import './connectionCheckPanel.css'

export function ConnectionCheckPanel({ onCheck }: { onCheck: () => Promise<ConnectionCheckResult> }) {
  const [result, setResult] = useState<ConnectionCheckResult | null>(null)
  const [busy, setBusy] = useState(false)
  async function run() {
    setBusy(true)
    try { setResult(await onCheck()) } finally { setBusy(false) }
  }
  const checks = result?.checks ?? [
    { id: 'network', label: '公司网络', status: 'skipped' as const },
    { id: 'access_code', label: '软件访问码', status: 'skipped' as const },
    { id: 'identity', label: '电脑身份钥匙', status: 'skipped' as const },
  ]
  return <section className="connection-check">
    <div className="connection-check__heading"><div>
      <h3>{result?.connected ? '全部连接正常' : '确认连接是否可用'}</h3>
      <p>{result?.username ? `已识别为 ${result.username}` : '只检查连接，不会改动项目文件。'}</p>
    </div><button className="button button--secondary" disabled={busy} onClick={() => void run()} type="button"><RefreshCw size={15} />{busy ? '正在检查' : '检查连接'}</button></div>
    <ul className="connection-check__list">{checks.map((item) => <li key={item.id}>
      {item.status === 'passed' ? <CheckCircle2 size={17} /> : item.status === 'failed' ? <XCircle size={17} /> : <CircleDashed size={17} />}
      <span><strong>{item.label}</strong>{'error' in item && item.error ? <small>{item.error.nextAction}</small> : null}</span>
    </li>)}</ul>
  </section>
}
