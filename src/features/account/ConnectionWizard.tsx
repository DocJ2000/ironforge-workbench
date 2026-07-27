import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Link2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { credentialClient } from '../../data/credentialClient'
import { identityClient } from '../../data/identityClient'
import './connectionWizard.css'

interface Props {
  projectId: string
  onConfigured: () => void
}

const steps = [
  '让软件连接公司 GitLab',
  '给这台电脑创建身份钥匙',
  '完成连接',
]

export function ConnectionWizard({ projectId, onConfigured }: Props) {
  const [step, setStep] = useState(0)
  const [token, setToken] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [loading, setLoading] = useState(identityClient.available())
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStep(0)
    setToken('')
    setPassphrase('')
    setPublicKey('')
    setError(null)
    if (!identityClient.available()) {
      setLoading(false)
      return
    }
    setLoading(true)
    void Promise.all([
      credentialClient.status(projectId),
      identityClient.status(projectId),
    ])
      .then(async ([credentials, identity]) => {
        if (credentials.configured && identity.configured) {
          setPublicKey(await identityClient.publicKey(projectId))
          setStep(2)
        }
      })
      .finally(() => setLoading(false))
  }, [projectId])

  async function generateIdentity() {
    setBusy(true)
    setError(null)
    try {
      const generated = await identityClient.generate({
        projectId,
        ...(passphrase ? { passphrase } : {}),
      })
      await credentialClient.save({
        projectId,
        baseUrl: 'https://gitlfs.lab.tp',
        token,
        sshKeyPath: generated.pathHint,
        ...(passphrase ? { sshPassphrase: passphrase } : {}),
      })
      setPublicKey(generated.publicKey)
      setToken('')
      setPassphrase('')
      setStep(2)
      onConfigured()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '创建身份钥匙失败')
    } finally {
      setBusy(false)
    }
  }

  async function copyPublicKey() {
    await navigator.clipboard.writeText(publicKey)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (loading) {
    return <div className="connection-wizard connection-wizard--loading">正在读取连接状态</div>
  }

  return (
    <section className="connection-wizard">
      <ol className="connection-steps" aria-label="连接步骤">
        {steps.map((label, index) => (
          <li className={index === step ? 'current' : index < step ? 'done' : ''} key={label}>
            <span>{index < step ? <Check size={14} /> : index + 1}</span>
            <small>{label}</small>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon"><Link2 size={24} /></span>
          <div>
            <h2>让软件连接公司 GitLab</h2>
            <p>先创建一个只给本软件使用的访问码。它不是你的登录密码。</p>
          </div>
          <a className="button button--secondary connection-wizard__link" href="https://gitlfs.lab.tp/-/user_settings/personal_access_tokens" rel="noreferrer" target="_blank">
            打开 GitLab 创建访问码 <ExternalLink size={15} />
          </a>
          <label className="plain-field connection-wizard__field">
            <span>软件访问码</span>
            <input aria-label="软件访问码" autoComplete="off" onChange={(event) => setToken(event.target.value)} placeholder="创建后粘贴到这里" type="password" value={token} />
          </label>
          <button className="button button--primary connection-wizard__next" disabled={!token.trim()} onClick={() => setStep(1)} type="button">下一步</button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon"><KeyRound size={24} /></span>
          <div>
            <h2>给这台电脑创建身份钥匙</h2>
            <p>软件会自动创建，不需要寻找文件或理解 SSH。</p>
          </div>
          <label className="plain-field connection-wizard__field">
            <span>身份钥匙密码（可以留空）</span>
            <input aria-label="身份钥匙密码（可以留空）" autoComplete="off" onChange={(event) => setPassphrase(event.target.value)} type="password" value={passphrase} />
          </label>
          {error ? <p className="credential-error">{error}</p> : null}
          <div className="connection-wizard__actions">
            <button className="button button--secondary" disabled={busy} onClick={() => setStep(0)} type="button">返回</button>
            <button className="button button--primary" disabled={busy} onClick={() => void generateIdentity()} type="button">{busy ? '正在创建' : '创建这台电脑的身份钥匙'}</button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon connection-wizard__icon--success"><KeyRound size={24} /></span>
          <div>
            <h2>把这台电脑登记到 GitLab</h2>
            <p>复制下面的公钥，再打开 GitLab 粘贴并保存。公钥可以公开，私钥不会离开这台电脑。</p>
          </div>
          <code className="public-key-output">{publicKey}</code>
          <div className="connection-wizard__actions">
            <button className="button button--secondary" onClick={() => void copyPublicKey()} type="button">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制公钥'}</button>
            <a className="button button--primary" href="https://gitlfs.lab.tp/-/user_settings/ssh_keys" rel="noreferrer" target="_blank">打开 GitLab 添加身份钥匙 <ExternalLink size={15} /></a>
          </div>
        </div>
      ) : null}
    </section>
  )
}
