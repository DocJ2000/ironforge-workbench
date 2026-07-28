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
import { createDeliveryApi } from '../../data/deliveryClient'
import { ConnectionCheckPanel } from './ConnectionCheckPanel'
import './connectionWizard.css'

interface Props {
  projectId: string
  checkProjectId?: string
  gitlabUrl?: string
  onBack?: () => void
  onConfigured: () => void | Promise<void>
}

const steps = [
  '让软件连接公司 GitLab',
  '给这台电脑创建身份钥匙',
  '把电脑登记到 GitLab',
  '检查并完成',
]

function connectionError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : ''
  if (/401|403|凭据|token|访问码/i.test(message)) {
    return '访问码不可用。请重新创建一个，并确认权限选择了 api。'
  }
  if (/public key|公钥|身份钥匙|ssh/i.test(message)) {
    return '这台电脑还没有登记到 GitLab。请复制电脑登记码并点击“打开 GitLab 添加”。'
  }
  if (/fetch|network|connect|timeout|网络|连接|服务器/i.test(message)) {
    return '暂时无法连接公司服务器。请确认已连接公司网络后重试。'
  }
  return message || '连接没有完成。请按页面步骤重试。'
}

export function ConnectionWizard({ projectId, checkProjectId, gitlabUrl = '', onBack, onConfigured }: Props) {
  const [step, setStep] = useState(0)
  const [token, setToken] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [identityPath, setIdentityPath] = useState('')
  const [identityConfigured, setIdentityConfigured] = useState(false)
  const [credentialsConfigured, setCredentialsConfigured] = useState(false)
  const [loading, setLoading] = useState(identityClient.available())
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const serverReady = Boolean(gitlabUrl.trim())

  useEffect(() => {
    setStep(0)
    setToken('')
    setPassphrase('')
    setPublicKey('')
    setIdentityPath('')
    setIdentityConfigured(false)
    setCredentialsConfigured(false)
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
        setCredentialsConfigured(credentials.configured)
        setIdentityConfigured(identity.configured)
        setIdentityPath(credentials.sshKeyPath ?? '')
        if (credentials.configured && identity.configured) {
          setPublicKey(await identityClient.publicKey(projectId))
        }
      })
      .finally(() => setLoading(false))
  }, [projectId])

  async function generateIdentity() {
    if (!token.trim()) {
      setError('请重新填写软件访问码，再创建新的电脑身份钥匙。')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const generated = await identityClient.generate({
        projectId,
        ...(passphrase ? { passphrase } : {}),
      })
      await credentialClient.save({
        projectId,
        baseUrl: gitlabUrl,
        token,
        sshKeyPath: generated.pathHint,
        ...(passphrase ? { sshPassphrase: passphrase } : {}),
      })
      setPublicKey(generated.publicKey)
      setIdentityPath(generated.pathHint)
      setIdentityConfigured(true)
      setCredentialsConfigured(true)
      setToken('')
      setPassphrase('')
      setStep(2)
    } catch (cause) {
      setError(connectionError(cause))
    } finally {
      setBusy(false)
    }
  }

  async function continueWithIdentity() {
    if (!publicKey) {
      await generateIdentity()
      return
    }
    if (token.trim()) {
      setBusy(true)
      setError(null)
      try {
        await credentialClient.save({
          projectId,
          baseUrl: gitlabUrl,
          token,
          sshKeyPath: identityPath,
          ...(passphrase ? { sshPassphrase: passphrase } : {}),
        })
        setCredentialsConfigured(true)
        setToken('')
      } catch (cause) {
        setError(connectionError(cause))
        return
      } finally {
        setBusy(false)
      }
    }
    setStep(2)
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
            {credentialsConfigured ? <p className="connection-wizard__saved">软件访问码已安全保存，可以继续使用。</p> : null}
          </div>
          <a aria-disabled={!serverReady} className="button button--secondary connection-wizard__link" href={serverReady ? `${gitlabUrl}/-/user_settings/personal_access_tokens` : undefined} rel="noreferrer" target="_blank">
            打开 GitLab 创建访问码 <ExternalLink size={15} />
          </a>
          <label className="plain-field connection-wizard__field">
            <span className="field-label-row">软件访问码
              <FieldHelp label="软件访问码">
                <strong>它不是登录密码。</strong>
                <ol>
                  <li>点击上方“打开 GitLab 创建访问码”。如果出现登录页面，先使用公司的账号完成登录。</li>
                  <li>进入访问令牌页面后，点击页面右上角的“添加新令牌”。</li>
                  <li>在“令牌名称”中填写 Ironforge Workbench，方便以后知道这个访问码是给本软件使用的。</li>
                  <li>“描述”可以填写“工程文件上传和图纸审核”；不想填写也可以留空。</li>
                  <li>按照公司要求选择“到期日期”。如果页面必须填写但你不确定，请先选择一个较近的日期，之后可以重新创建。</li>
                  <li>找到“选择范围”或“权限”区域，只勾选 api。不要勾选与你工作无关的其他权限。</li>
                  <li>检查名称和权限后，点击页面下方的“创建个人访问令牌”。</li>
                  <li>创建成功后，立即复制页面显示的新令牌。这个完整令牌通常只显示一次，关闭页面后无法再次查看。</li>
                  <li>回到本软件，把刚复制的内容粘贴到下面的“软件访问码”，再点击“下一步”。</li>
                </ol>
              </FieldHelp>
            </span>
            <input aria-label="软件访问码" autoComplete="off" onChange={(event) => setToken(event.target.value)} placeholder="创建后粘贴到这里" type="password" value={token} />
          </label>
          <div className="connection-wizard__actions">
            {onBack ? <button className="button button--secondary" onClick={onBack} type="button">返回</button> : null}
            <button className="button button--primary" disabled={!serverReady || ((!credentialsConfigured || !identityConfigured) && !token.trim())} onClick={() => setStep(1)} type="button">
              {credentialsConfigured && identityConfigured && !token.trim() ? '继续使用已保存访问码' : '下一步'}
            </button>
          </div>
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
            <p>软件会自动创建，你不需要寻找任何文件，也不需要了解连接技术。</p>
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
            <button className="button button--primary" disabled={busy} onClick={() => void continueWithIdentity()} type="button">
              {busy ? '正在创建' : publicKey ? '继续使用已有身份钥匙' : '创建这台电脑的身份钥匙'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon connection-wizard__icon--success"><KeyRound size={24} /></span>
          <div>
            <h2 className="field-label-row">把这台电脑登记到 GitLab
              <FieldHelp label="电脑登记码">
                <strong>电脑登记码可以复制到 GitLab。</strong>
                <p>公钥只用于登记这台电脑，不能反推出私钥。不要把没有 .pub 后缀的私钥文件发送给任何人。</p>
              </FieldHelp>
            </h2>
            <p>复制下面的电脑登记码，再打开 GitLab 粘贴并保存。登记码可以公开，电脑身份钥匙不会离开这台电脑。</p>
            <p className="connection-wizard__saved">软件访问码已安全保存，不需要再次填写。</p>
          </div>
          <code className="public-key-output">{publicKey}</code>
          <div className="connection-wizard__actions">
            <button className="button button--secondary" onClick={() => void copyPublicKey()} type="button">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? '已复制' : '复制电脑登记码'}</button>
            <a className="button button--primary" href={`${gitlabUrl}/-/user_settings/ssh_keys`} rel="noreferrer" target="_blank">打开 GitLab 添加身份钥匙 <ExternalLink size={15} /></a>
          </div>
          <div className="connection-wizard__actions">
            <button className="button button--secondary" onClick={() => setStep(1)} type="button">返回修改上一步</button>
            <button className="button button--primary" onClick={() => setStep(3)} type="button">已添加，下一步</button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="connection-wizard__body">
          <span className="connection-wizard__icon connection-wizard__icon--success"><Check size={24} /></span>
          <div>
            <h2>检查连接</h2>
            <p>点击一次会同时检查公司网络、软件访问码和电脑身份钥匙。三项全部通过后会自动完成初始设置。</p>
          </div>
          <ConnectionCheckPanel
            onCheck={() => createDeliveryApi(checkProjectId).checkConnection()}
            onConnected={onConfigured}
          />
          <div className="connection-wizard__actions">
            <button className="button button--secondary" onClick={() => setStep(0)} type="button">返回修改软件访问码</button>
            <button className="button button--secondary" onClick={() => setStep(2)} type="button">返回修改上一步</button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
