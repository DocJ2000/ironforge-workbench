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
import { FieldHelp } from './FieldHelp'
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

function connectionError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : ''
  if (/401|403|凭据|token|访问码/i.test(message)) {
    return '访问码不可用。请重新创建一个，并确认权限选择了 api。'
  }
  if (/public key|公钥|身份钥匙|ssh/i.test(message)) {
    return '身份钥匙还没有添加到 GitLab。请复制公钥并点击“打开 GitLab 添加”。'
  }
  if (/fetch|network|connect|timeout|网络|连接|服务器/i.test(message)) {
    return '暂时无法连接公司服务器。请确认已连接公司网络后重试。'
  }
  return message || '连接没有完成。请按页面步骤重试。'
}

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
      setError(connectionError(cause))
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
            <span className="field-label-row">软件访问码
              <FieldHelp label="软件访问码">
                <strong>它不是登录密码。</strong>
                <ol>
                  <li>点击上方按钮打开 GitLab。</li>
                  <li>名称填写 Ironforge Workbench。</li>
                  <li>权限勾选 api，然后创建。</li>
                  <li>复制新访问码并粘贴到这里。它通常只显示一次。</li>
                </ol>
              </FieldHelp>
            </span>
            <input aria-label="软件访问码" autoComplete="off" onChange={(event) => setToken(event.target.value)} placeholder="创建后粘贴到这里" type="password" value={token} />
          </label>
          <button className="button button--primary connection-wizard__next" disabled={!token.trim()} onClick={() => setStep(1)} type="button">下一步</button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon"><KeyRound size={24} /></span>
          <div>
            <h2 className="field-label-row">给这台电脑创建身份钥匙
              <FieldHelp label="电脑身份钥匙">
                <strong>它用于证明这台电脑可以操作你的项目。</strong>
                <p>软件会自动创建并保存在电脑的安全目录，不会放进工程，也不会把私钥上传到服务器。</p>
              </FieldHelp>
            </h2>
            <p>软件会自动创建，不需要寻找文件或理解 SSH。</p>
          </div>
          <label className="plain-field connection-wizard__field">
            <span className="field-label-row">身份钥匙密码（可以留空）
              <FieldHelp label="身份钥匙密码">
                <strong>它不是 GitLab 密码。</strong>
                <p>这是给电脑身份钥匙增加的额外保护。不想每次输入密码可以留空；设置后忘记了无法找回。</p>
              </FieldHelp>
            </span>
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
            <h2 className="field-label-row">把这台电脑登记到 GitLab
              <FieldHelp label="公钥">
                <strong>公钥可以复制到 GitLab。</strong>
                <p>公钥只用于登记这台电脑，不能反推出私钥。不要把没有 .pub 后缀的私钥文件发送给任何人。</p>
              </FieldHelp>
            </h2>
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
