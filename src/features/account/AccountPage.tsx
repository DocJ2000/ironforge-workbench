import { AlertTriangle, CheckCircle2, Eye, EyeOff, FolderOpen, KeyRound, Server, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { credentialClient } from '../../data/credentialClient'
import { desktopDialogClient } from '../../data/desktopDialogClient'
import { ConnectionWizard } from './ConnectionWizard'
import { FieldHelp } from './FieldHelp'
import { ClearConnectionDialog } from './ClearConnectionDialog'
import { organizationClient } from '../../data/organizationClient'
import { userDataClient } from '../../data/userDataClient'
import './account.css'
import './accountNav.css'
import './credentialFields.css'
import './requiredSetup.css'
import { SoftwareUpdatePanel } from './SoftwareUpdatePanel'

const computerAccountId = 'computer'
const verifiedStorageKey = 'ironforge-workbench:connection-verified'
type AccountView = 'welcome' | 'organization' | 'connection' | 'summary'

export function AccountPage({ checkProjectId }: { checkProjectId?: string }) {
  const location = useLocation()
  const setupRequired = Boolean(
    (location.state as { setupRequired?: boolean } | null)?.setupRequired,
  )
  const initialOrganization = organizationClient.load()
  const [gitlabUrl, setGitlabUrl] = useState(initialOrganization.gitlabUrl)
  const [ironforgeUrl, setIronforgeUrl] = useState(initialOrganization.ironforgeUrl)
  const [organizationSaved, setOrganizationSaved] = useState(Boolean(initialOrganization.gitlabUrl))
  const [token, setToken] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [checked, setChecked] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showClear, setShowClear] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [view, setView] = useState<AccountView>('welcome')
  const desktopStorage = credentialClient.available()
  const complete = Boolean(gitlabUrl.trim() && token.trim() && keyPath.trim())

  useEffect(() => {
    setToken('')
    setPassphrase('')
    setChecked(false)
    setConfigured(false)
    setError(null)
    if (!desktopStorage) return
    void Promise.all([
      credentialClient.status(computerAccountId),
      organizationClient.loadDurable(),
    ]).then(([status, organization]) => {
      setConfigured(status.configured)
      setGitlabUrl(organization.gitlabUrl || status.baseUrl || '')
      setIronforgeUrl(organization.ironforgeUrl)
      setOrganizationSaved(Boolean(organization.gitlabUrl || status.baseUrl))
      setKeyPath(status.sshKeyPath ?? '')
      const verified = organization.connectionVerified === true
        || localStorage.getItem(verifiedStorageKey) === 'true'
      const recoveredUrl = organization.gitlabUrl || status.baseUrl || ''
      if (status.configured && recoveredUrl && !organization.gitlabUrl) {
        organizationClient.save({
          gitlabUrl: recoveredUrl,
          ironforgeUrl: organization.ironforgeUrl,
          connectionVerified: true,
        })
      }
      setView(status.configured && Boolean(recoveredUrl) && (verified || !organization.gitlabUrl) ? 'summary' : 'welcome')
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

      {setupRequired && (!organizationSaved || !configured) ? (
        <section className="required-setup-notice" role="status">
          <h2>请先完成必填设置</h2>
          <p>完成下面两项后，才能进入 GitLab 项目页面。</p>
          <ol>
            <li className={organizationSaved ? 'done' : ''}>填写并保存公司服务器地址</li>
            <li className={configured ? 'done' : ''}>完成“个人连接公司 GitLab”</li>
          </ol>
        </section>
      ) : null}

      {view === 'welcome' ? (
        <section className="account-welcome">
          <span className="account-welcome__icon"><KeyRound size={28} /></span>
          <p className="task-eyebrow">第一次只需设置一次</p>
          <h2>连接公司项目服务器</h2>
          <p>软件会一步一步带你完成。不会上传项目，也不会改动工程文件。</p>
          <button className="button button--primary" onClick={() => setView('organization')} type="button">开始设置</button>
        </section>
      ) : null}

      {view === 'organization' ? <section className="connection-section account-step-card">
        <header>
          <span className="connection-icon connection-icon--gitlab">1</span>
          <div><span className="task-eyebrow">第 1 步，共 6 步</span><h2>填写公司地址</h2><p>第一次使用时填写一次，软件升级不会清除。</p></div>
          <span className={`connection-status connection-status--${organizationSaved ? 'ready' : 'pending'}`}>{organizationSaved ? '已保存' : '需要填写'}</span>
        </header>
        <div className="connection-form">
          <label className="plain-field"><span className="field-label-row">公司项目服务器地址<FieldHelp label="公司项目服务器地址"><strong>这是公司 GitLab 登录页面的开头部分。</strong><ol><li>打开公司 GitLab 登录页面。</li><li>复制浏览器地址中域名部分，例如 https://gitlab.example.com。</li><li>不要复制项目后面的长路径。</li><li>不确定时询问管理员。</li></ol></FieldHelp></span><input aria-label="公司项目服务器地址" onChange={(event) => { setGitlabUrl(event.target.value); setOrganizationSaved(false) }} placeholder="例如：https://gitlab.example.com" value={gitlabUrl} /></label>
        </div>
        <footer>
          <button className="button button--secondary" onClick={() => setView('welcome')} type="button">返回</button>
          <button className="button button--primary" disabled={!gitlabUrl.trim() || busy} onClick={() => {
            setBusy(true)
            setError(null)
            void organizationClient.saveDurable({ gitlabUrl, ironforgeUrl })
              .then((saved) => {
                setGitlabUrl(saved.gitlabUrl)
                setIronforgeUrl(saved.ironforgeUrl)
                setOrganizationSaved(true)
                localStorage.removeItem(verifiedStorageKey)
                setView('connection')
              })
              .catch(() => setError('公司地址没有保存成功，请重试。'))
              .finally(() => setBusy(false))
          }} type="button">{busy ? '正在保存' : '保存并继续'}</button>
        </footer>
      </section> : null}

      {view === 'connection' ? <ConnectionWizard
        onConfigured={async () => {
          try {
            await organizationClient.saveDurable({
              gitlabUrl,
              ironforgeUrl,
              connectionVerified: true,
            })
            localStorage.setItem(verifiedStorageKey, 'true')
            setConfigured(true)
            setView('summary')
          } catch {
            setError('连接已经检查通过，但设置没有保存到电脑。请再点一次“检查连接”。')
            throw new Error('设置没有保存到电脑')
          }
        }}
        onBack={() => setView('organization')}
        projectId={computerAccountId}
        checkProjectId={checkProjectId}
        gitlabUrl={gitlabUrl}
      /> : null}

      {view === 'summary' ? (
        <>
          <section className="account-summary">
            <span className="account-summary__icon"><CheckCircle2 size={28} /></span>
            <div><p className="task-eyebrow">连接状态</p><h2>已完成初始设置</h2><p>公司地址和个人连接信息已经安全保存。</p></div>
            <span className="connection-status connection-status--ready">可以使用</span>
            <dl>
              <div><dt>公司项目服务器</dt><dd>{gitlabUrl}</dd></div>
              <div><dt>铁炉堡</dt><dd>{ironforgeUrl ? '地址已设置' : '尚未设置'}</dd></div>
              <div><dt>软件访问码</dt><dd>已安全保存</dd></div>
              <div><dt>电脑身份钥匙</dt><dd>已保存在本机</dd></div>
            </dl>
            <button className="button button--secondary" onClick={() => {
              localStorage.removeItem(verifiedStorageKey)
              setView('organization')
            }} type="button">重新设置连接</button>
          </section>
          <SoftwareUpdatePanel />
        </>
      ) : null}

      {view === 'summary' ? <details className="advanced-connection">
        <summary>专业显示：服务器地址与身份钥匙</summary>
        <div className="professional-settings">
          <section className="professional-section professional-section--servers">
            <header>
              <span className="connection-icon professional-section__icon"><Server size={20} /></span>
              <div><h2>服务器地址</h2><p>软件通过这两个地址打开公司的 GitLab 和铁炉堡。</p></div>
            </header>
            <div className="professional-server-grid">
              <label className="plain-field"><span>GitLab 地址</span><input aria-label="GitLab 地址" onChange={(event) => setGitlabUrl(event.target.value)} value={gitlabUrl} /></label>
              <label className="plain-field"><span className="field-label-row">铁炉堡地址<FieldHelp label="铁炉堡地址"><strong>这是铁炉堡项目列表的完整网页地址。</strong><ol><li>在浏览器中打开铁炉堡。</li><li>进入项目列表页面。</li><li>复制浏览器顶部的完整地址。</li><li>粘贴后点击“保存服务器地址”。</li></ol></FieldHelp></span><input aria-label="铁炉堡地址" onChange={(event) => setIronforgeUrl(event.target.value)} placeholder="例如：https://delivery.example.com/projects" value={ironforgeUrl} /></label>
            </div>
            <footer>
              <button className="button button--secondary" disabled={!gitlabUrl.trim() || busy} onClick={() => {
                setBusy(true)
                setError(null)
                void organizationClient.saveDurable({
                  gitlabUrl,
                  ironforgeUrl,
                  connectionVerified: true,
                }).then((saved) => {
                  setGitlabUrl(saved.gitlabUrl)
                  setIronforgeUrl(saved.ironforgeUrl)
                }).catch(() => setError('服务器地址没有保存成功，请重试。'))
                  .finally(() => setBusy(false))
              }} type="button">保存服务器地址</button>
            </footer>
          </section>
          <section className="professional-section professional-section--credentials">
            <header>
              <span className="connection-icon connection-icon--gitlab"><KeyRound size={21} /></span>
              <div><h2>个人连接凭证</h2><p>软件访问码负责审核和 MR，电脑身份钥匙负责上传、下载项目文件。</p></div>
              <span className={`connection-status connection-status--${configured || checked ? 'ready' : 'pending'}`}>
                {configured ? '已安全保存' : checked ? '填写完整' : '尚未配置'}
              </span>
            </header>
            <div className="professional-credential-grid">
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
        </div>
      </details> : null}

      {view === 'summary' ? (
        <section className="account-reset">
          <div className="account-reset__icon"><Trash2 size={20} /></div>
          <div>
            <h2>重置用户信息</h2>
            <p>准备把这台电脑交给别人使用时，可清除账号、身份钥匙和软件里的项目记录。</p>
          </div>
          <button className="button button--secondary" onClick={() => setShowReset(true)} type="button">重置用户信息</button>
        </section>
      ) : null}

      {showClear ? <ClearConnectionDialog busy={busy} onCancel={() => setShowClear(false)} onConfirm={() => {
        setBusy(true)
        void credentialClient.clear(computerAccountId).then(() => {
          localStorage.removeItem(verifiedStorageKey)
          setConfigured(false)
          setShowClear(false)
          setView('welcome')
        }).finally(() => setBusy(false))
      }} /> : null}
      {showReset ? (
        <div className="dialog-backdrop" role="presentation">
          <section aria-labelledby="reset-user-title" aria-modal="true" className="reset-user-dialog" role="dialog">
            <span className="reset-user-dialog__icon"><AlertTriangle size={24} /></span>
            <h2 id="reset-user-title">确定重置这台电脑的用户信息？</h2>
            <p>软件会关闭并重新打开，回到第一次使用时的设置页面。</p>
            <div className="reset-user-dialog__details">
              <strong>会清除</strong>
              <p>公司服务器地址、软件访问码、软件创建的身份钥匙、项目列表和本机操作记录。</p>
              <strong>不会清除</strong>
              <p>你选择过的工程文件夹、工程图纸和 GitLab 云端文件。</p>
            </div>
            <footer>
              <button className="button button--secondary" disabled={resetting} onClick={() => setShowReset(false)} type="button">取消</button>
              <button className="button button--danger" disabled={resetting} onClick={() => {
                setResetting(true)
                void userDataClient.reset().catch((cause) => {
                  setError(cause instanceof Error ? cause.message : '重置失败，请关闭软件后重试')
                  setResetting(false)
                  setShowReset(false)
                })
              }} type="button">{resetting ? '正在重置' : '确定重置'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}
