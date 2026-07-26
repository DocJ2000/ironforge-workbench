import { ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { credentialClient } from '../../data/credentialClient'
import type { RegisteredProject } from '../../data/repositoryContext'
import './account.css'
import './accountNav.css'
import './credentialFields.css'

interface Props {
  projects: RegisteredProject[]
  selectedId: string
  onSelect: (id: string) => void
}

export function AccountPage({ projects, selectedId, onSelect }: Props) {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlfs.lab.tp')
  const [token, setToken] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [checked, setChecked] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const desktopStorage = credentialClient.available()
  const complete = Boolean(gitlabUrl.trim() && token.trim() && keyPath.trim())
  const selectedProject = projects.find((project) => project.id === selectedId)

  useEffect(() => {
    setToken('')
    setPassphrase('')
    setChecked(false)
    setConfigured(false)
    setError(null)
    if (!desktopStorage || !selectedId) return
    void credentialClient.status(selectedId).then((status) => {
      setConfigured(status.configured)
      setGitlabUrl(status.baseUrl ?? 'https://gitlfs.lab.tp')
      setKeyPath(status.sshKeyPath ?? '')
    })
  }, [desktopStorage, selectedId])

  async function saveCredentials() {
    if (!desktopStorage) {
      setChecked(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const status = await credentialClient.save({
        projectId: selectedId,
        baseUrl: gitlabUrl,
        token,
        sshKeyPath: keyPath,
        ...(passphrase ? { sshPassphrase: passphrase } : {}),
      })
      setConfigured(status.configured)
      setToken('')
      setPassphrase('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '安全保存失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <span className="task-eyebrow">设置</span>
        <h1>账户与连接</h1>
        <p>管理 GitLab 文件传输和铁炉堡网页登录。密码与密钥不会放进工程文件。</p>
      </header>

      <section className="account-project">
        <label className="plain-field">
          <span>为哪个项目设置连接</span>
          <select
            aria-label="为哪个项目设置连接"
            onChange={(event) => onSelect(event.target.value)}
            value={selectedId}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.repository.name}
              </option>
            ))}
          </select>
        </label>
        <p>{selectedProject?.repository.path ?? '请先添加本地项目'}</p>
      </section>

      <section className="connection-section">
        <header>
          <span className="connection-icon connection-icon--gitlab"><KeyRound size={21} /></span>
          <div><h2>GitLab</h2><p>SSH Key 负责项目文件，Token 负责审核人、MR 和附件。</p></div>
          <span className={`connection-status connection-status--${configured || checked ? 'ready' : 'pending'}`}>
            {configured ? '已安全保存' : checked ? '填写完整' : '尚未配置'}
          </span>
        </header>
        <div className="connection-form">
          <label className="plain-field"><span>GitLab 地址</span><input aria-label="GitLab 地址" onChange={(event) => setGitlabUrl(event.target.value)} value={gitlabUrl} /></label>
          <label className="plain-field"><span>GitLab Token</span><span className="secret-input"><input aria-label="GitLab Token" autoComplete="off" onChange={(event) => { setToken(event.target.value); setChecked(false) }} placeholder="粘贴个人访问令牌" type={showToken ? 'text' : 'password'} value={token} /><button aria-label={showToken ? '隐藏 Token' : '显示 Token'} onClick={() => setShowToken((value) => !value)} type="button">{showToken ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <label className="plain-field"><span>SSH 私钥路径</span><input aria-label="SSH 私钥路径" onChange={(event) => { setKeyPath(event.target.value); setChecked(false) }} placeholder="例如：C:\Users\name\.ssh\id_ed25519" value={keyPath} /></label>
          <label className="plain-field"><span>SSH 私钥密码（可选）</span><input aria-label="SSH 私钥密码（可选）" autoComplete="off" onChange={(event) => setPassphrase(event.target.value)} type="password" value={passphrase} /></label>
        </div>
        <div className="connection-note"><ShieldCheck size={16} /><span>{desktopStorage ? 'Token 和私钥密码将由 Windows 系统加密保存，页面无法读取回明文。' : '浏览器预览只在内存中检查填写内容，刷新页面后会清空；桌面版才会安全保存。'}</span></div>
        {error ? <p className="credential-error">{error}</p> : null}
        <footer>
          {configured ? <button className="button button--secondary" disabled={busy} onClick={() => void credentialClient.clear(selectedId).then(() => setConfigured(false))} type="button">清除此项目的 GitLab 登录</button> : null}
          <button className="button button--primary" disabled={!complete || busy} onClick={() => void saveCredentials()} type="button">{desktopStorage ? busy ? '正在安全保存' : '安全保存' : '检查填写内容'}</button>
        </footer>
      </section>

      <section className="connection-section">
        <header>
          <span className="connection-icon connection-icon--ironforge">IF</span>
          <div><h2>铁炉堡</h2><p>通过公司 SSO 登录，登录会话由浏览器管理。</p></div>
          <span className="connection-status connection-status--browser">浏览器 SSO</span>
        </header>
        <div className="ironforge-account-copy">
          <p>提交发布由 GitLab MR 合并触发，不需要在软件里重复填写铁炉堡密码。</p>
          <p>如需查看或下载已发布图纸，请在浏览器完成公司 SSO 登录。</p>
        </div>
        <footer>
          <a className="button button--primary" href="http://ironforge.holo.tp/projects" rel="noreferrer" target="_blank">
            打开铁炉堡并登录
            <ExternalLink size={16} />
          </a>
        </footer>
      </section>
    </div>
  )
}
