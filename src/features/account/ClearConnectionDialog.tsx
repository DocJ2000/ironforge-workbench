export function ClearConnectionDialog({ busy, onCancel, onConfirm }: { busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="dialog-backdrop" role="presentation"><section aria-modal="true" className="dialog-card" role="dialog"><h2>清除本机登录信息？</h2><p>将删除软件访问码和身份钥匙密码。这台电脑的身份钥匙文件、项目文件夹和工程文件都会保留。</p><div className="connection-wizard__actions"><button className="button button--secondary" onClick={onCancel} type="button">取消</button><button className="button button--danger" disabled={busy} onClick={onConfirm} type="button">清除本机登录信息</button></div></section></div>
}
