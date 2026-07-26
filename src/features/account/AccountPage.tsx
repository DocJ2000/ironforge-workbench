import { ExternalLink, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import './account.css'
import './accountNav.css'

export function AccountPage() {
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlfs.lab.tp')
  const [token, setToken] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [checked, setChecked] = useState(false)
  const complete = Boolean(gitlabUrl.trim() && token.trim() && keyPath.trim())

  return (
    <div className="account-page">
      <header className="account-header">
        <span className="task-eyebrow">设置</span>
        <h1>账户与连接</h1>
        <p>管理 GitLab 文件传输和铁炉堡网页登录。密码与密钥不会放进工程文件。</p>
      </header>

      <section className="connection-section">
        <header>
          <span className="connection-icon connection-icon--gitlab"><KeyRound size={21} /></span>
          <div><h2>GitLab</h2><p>SSH Key 负责项目文件，Token 负责审核人、MR 和附件。</p></div>
          <span className={`connection-status connection-status--${checked ? 'ready' : 'pending'}`}>
            {checked ? '填写完整' : '尚未配置'}
          </span>
        </header>
        <div className="connection-form">
          <label className="plain-field"><span>GitLab 地址</span><input aria-label="GitLab 地址" onChange={(event) => setGitlabUrl(event.target.value)} value={gitlabUrl} /></label>
          <label className="plain-field"><span>GitLab Token</span><span className="secret-input"><input aria-label="GitLab Token" autoComplete="off" onChange={(event) => { setToken(event.target.value); setChecked(false) }} placeholder="粘贴个人访问令牌" type={showToken ? 'text' : 'password'} value={token} /><button aria-label={showToken ? '隐藏 Token' : '显示 Token'} onClick={() => setShowToken((value) => !value)} type="button">{showToken ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
          <label className="plain-field"><span>SSH 私钥路径</span><input aria-label="SSH 私钥路径" onChange={(event) => { setKeyPath(event.target.value); setChecked(false) }} placeholder="例如：C:\Users\name\.ssh\id_ed25519" value={keyPath} /></label>
        </div>
        <div className="connection-note"><ShieldCheck size={16} /><span>当前预览只在内存中检查填写内容，刷新页面后会清空。正式版将使用 Windows 凭据管理器。</span></div>
        <footer><button className="button button--primary" disabled={!complete} onClick={() => setChecked(true)} type="button">检查填写内容</button></footer>
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
