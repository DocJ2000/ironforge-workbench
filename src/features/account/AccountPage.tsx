import { ExternalLink, Eye, EyeOff, FolderOpen, KeyRound, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { credentialClient } from '../../data/credentialClient'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import { ConnectionWizard } from './ConnectionWizard'
import { FieldHelp } from './FieldHelp'
import { ClearConnectionDialog } from './ClearConnectionDialog'
import { organizationClient } from '../../data/organizationClient'
import './account.css'
import './accountNav.css'
import './credentialFields.css'

const computerAccountId = 'computer'

export function AccountPage({ checkProjectId }: { checkProjectId?: string }) {
  const initialOrganization = organizationClient.load()
  const [gitlabUrl, setGitlabUrl] = useState(initialOrganization.gitlabUrl)
  const [ironforgeUrl, setIronforgeUrl] = useState(initialOrganization.ironforgeUrl)
  const [organizationSaved, setOrganizationSaved] = useState(Boolean(initialOrganization.gitlabUrl && initialOrganization.ironforgeUrl))
  const [token, setToken] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [checked, setChecked] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClear, setShowClear] = useState(false)
  const desktopStorage = credentialClient.available()
  const complete = Boolean(gitlabUrl.trim() && token.trim() && keyPath.trim())

  useEffect(() => {
    setToken('')
    setPassphrase('')
    setChecked(false)
    setConfigured(false)
    setError(null)
    if (!desktopStorage) return
    void credentialClient.status(computerAccountId).then((status) => {
      setConfigured(status.configured)
      setGitlabUrl((current) => current || status.baseUrl || '')
      setKeyPath(status.sshKeyPath ?? '')
    })
  }, [desktopStorage])

  async function saveCredentials() {
    if (!desktopStorage) {
      setChecked(true)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const status = await credentialClient.save({
        projectId: computerAccountId,
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
        <p>管理公司项目服务器和铁炉堡的连接。密码与身份钥匙不会放进工程文件。</p>
      </header>

      <section className="connection-section">
        <header>
          <span className="connection-icon connection-icon--gitlab">1</span>
          <div><h2>公司服务器地址</h2><p>第一次使用时填写一次，软件升级不会清除。</p></div>
          <span className={`connection-status connection-status--${organizationSaved ? 'ready' : 'pending'}`}>{organizationSaved ? '已保存' : '需要填写'}</span>
        </header>
        <div className="connection-form">
          <label className="plain-field"><span className="field-label-row">公司项目服务器地址<FieldHelp label="公司项目服务器地址"><strong>这是公司 GitLab 登录页面的开头部分。</strong><ol><li>打开公司 GitLab 登录页面。</li><li>复制浏览器地址中域名部分，例如 https://gitlab.example.com。</li><li>不要复制项目后面的长路径。</li><li>不确定时询问管理员。</li></ol></FieldHelp></span><input aria-label="公司项目服务器地址" onChange={(event) => { setGitlabUrl(event.target.value); setOrganizationSaved(false) }} placeholder="例如：https://gitlab.example.com" value={gitlabUrl} /></label>
          <label className="plain-field"><span className="field-label-row">交付平台地址<FieldHelp label="交付平台地址"><strong>这是浏览器中打开交付平台项目列表时的完整地址。</strong><ol><li>在浏览器中打开公司的交付平台。</li><li>进入项目列表页面。</li><li>复制浏览器顶部的完整地址并粘贴到这里。</li><li>不确定时询问管理员。</li></ol></FieldHelp></span><input aria-label="交付平台地址" onChange={(event) => { setIronforgeUrl(event.target.value); setOrganizationSaved(false) }} placeholder="例如：https://delivery.example.com/projects" value={ironforgeUrl} /></label>
        </div>
        <footer><button className="button button--primary" disabled={!gitlabUrl.trim() || !ironforgeUrl.trim()} onClick={() => { const saved = organizationClient.save({ gitlabUrl, ironforgeUrl }); setGitlabUrl(saved.gitlabUrl); setIronforgeUrl(saved.ironforgeUrl); setOrganizationSaved(true) }} type="button">保存公司地址</button></footer>
      </section>

      {organizationSaved ? <ConnectionWizard
        onConfigured={() => setConfigured(true)}
        projectId={computerAccountId}
        checkProjectId={checkProjectId}
        gitlabUrl={gitlabUrl}
      /> : null}

      <details className="advanced-connection">
        <summary>高级设置</summary>
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
          <label className="plain-field"><span className="field-label-row">GitLab Token<FieldHelp label="GitLab Token"><strong>也就是软件访问码，不是登录密码。</strong><p>在 GitLab 的 Access Tokens 页面创建，权限选择 api。创建后通常只显示一次。</p></FieldHelp></span><span className="secret-input"><input aria-label="GitLab Token" autoComplete="off" onChange={(event) => { setToken(event.target.value); setChecked(false) }} placeholder="粘贴个人访问令牌" type={showToken ? 'text' : 'password'} value={token} /><button aria-label={showToken ? '隐藏 Token' : '显示 Token'} onClick={() => setShowToken((value) => !value)} type="button">{showToken ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <label className="plain-field"><span className="field-label-row">SSH 私钥路径<FieldHelp label="SSH 私钥路径"><strong>选择没有 .pub 后缀的文件。</strong><p>常见位置是 C:\Users\用户名\.ssh\id_ed25519。带 .pub 的文件是可以添加到 GitLab 的公钥。</p></FieldHelp></span><span className="path-input"><input aria-label="SSH 私钥路径" onChange={(event) => { setKeyPath(event.target.value); setChecked(false) }} placeholder="例如：C:\Users\name\.ssh\id_ed25519" value={keyPath} />{desktopDialogClient.available() ? <button aria-label="选择 SSH 私钥" onClick={() => void desktopDialogClient.chooseSshKey().then((path) => { if (path) setKeyPath(path) })} title="选择 SSH 私钥" type="button"><FolderOpen size={17} /></button> : null}</span></label>
          <label className="plain-field"><span className="field-label-row">SSH 私钥密码（可选）<FieldHelp label="SSH 私钥密码"><strong>它不是 GitLab 密码。</strong><p>生成身份钥匙时没有设置密码就留空；忘记后无法找回，需要重新创建身份钥匙。</p></FieldHelp></span><input aria-label="SSH 私钥密码（可选）" autoComplete="off" onChange={(event) => setPassphrase(event.target.value)} type="password" value={passphrase} /></label>
        </div>
        <div className="connection-note"><ShieldCheck size={16} /><span>{desktopStorage ? 'Token 和私钥密码将由 Windows 系统加密保存，页面无法读取回明文。' : '浏览器预览只在内存中检查填写内容，刷新页面后会清空；桌面版才会安全保存。'}</span></div>
        {error ? <p className="credential-error">{error}</p> : null}
        <footer>
          {configured ? <button className="button button--secondary" disabled={busy} onClick={() => setShowClear(true)} type="button">清除这台电脑的连接</button> : null}
          <button className="button button--primary" disabled={!complete || busy} onClick={() => void saveCredentials()} type="button">{desktopStorage ? busy ? '正在安全保存' : '安全保存' : '检查填写内容'}</button>
        </footer>
      </section>
      </details>

      <section className="connection-section">
        <header>
          <span className="connection-icon connection-icon--ironforge">IF</span>
          <div><h2>铁炉堡</h2><p>使用公司的统一登录页面，登录状态由浏览器管理。</p></div>
          <span className="connection-status connection-status--browser">公司统一登录</span>
        </header>
        <div className="ironforge-account-copy">
          <p>管理员批准交付审核单后，系统会自动开始铁炉堡发布，不需要在软件里重复填写铁炉堡密码。</p>
          <p>如需查看或下载已发布图纸，请在浏览器完成公司统一登录。</p>
        </div>
        <footer>
          <a className="button button--primary" href={ironforgeUrl} rel="noreferrer" target="_blank">
            打开铁炉堡并登录
            <ExternalLink size={16} />
          </a>
        </footer>
      </section>
      {showClear ? <ClearConnectionDialog busy={busy} onCancel={() => setShowClear(false)} onConfirm={() => { setBusy(true); void credentialClient.clear(computerAccountId).then(() => { setConfigured(false); setShowClear(false) }).finally(() => setBusy(false)) }} /> : null}
    </div>
  )
}
