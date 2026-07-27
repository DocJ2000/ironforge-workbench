import { ExternalLink, LogIn, PanelTopOpen } from 'lucide-react'
import { ironforgeWindowClient } from '../../data/ironforgeWindowClient'
import { organizationClient } from '../../data/organizationClient'
import './ironforgePortal.css'

export function IronforgePortalPage() {
  const ironforgeUrl = organizationClient.load().ironforgeUrl
  return (
    <div className="task-page ironforge-portal">
      <header>
        <span className="task-eyebrow">铁炉堡</span>
        <h1>正式图纸</h1>
        <p>铁炉堡使用单独的权限和登录页面，不会使用你的 GitLab 访问码。</p>
      </header>
      <section className="ironforge-portal__panel">
        <span className="ironforge-portal__mark">IF</span>
        <div><h2>打开铁炉堡</h2><p>请选择你习惯的打开方式。两种方式都会进入铁炉堡官方登录页面。</p></div>
        <div className="ironforge-portal__choices">
          <button className="button button--primary" disabled={!ironforgeUrl} onClick={() => void ironforgeWindowClient.open(ironforgeUrl)} type="button"><PanelTopOpen size={18} />在软件内打开</button>
          {ironforgeUrl ? <a className="button button--secondary" href={ironforgeUrl} rel="noreferrer" target="_blank"><ExternalLink size={18} />使用浏览器打开</a> : <button className="button button--secondary" disabled type="button"><ExternalLink size={18} />使用浏览器打开</button>}
        </div>
        {!ironforgeUrl ? <p className="ironforge-portal__missing"><LogIn size={16} />请先在左下角“账户与连接”中填写铁炉堡地址。</p> : null}
        <p className="ironforge-portal__privacy">登录由铁炉堡官方页面完成，本软件不会拿走或保存你的登录信息。</p>
      </section>
    </div>
  )
}
