# Credential Field Help Design

## Goal

让不了解 GitLab 和 SSH 的工程师在设置页内直接知道每项凭据的含义与获取方式，同时保持默认界面简洁。

## Interaction

- `GitLab Token`、`SSH 私钥路径`、`SSH 私钥密码`的字段标题右侧各显示一个小问号图标按钮。
- 点击问号后，仅在对应输入框下方展开详细步骤；再次点击收起。
- 三项帮助互相独立，可以同时展开。
- 按钮提供明确的无障碍名称和展开状态，支持鼠标、键盘与触屏。

## Content

### GitLab Token

- 说明它不是登录密码。
- 指引进入 GitLab 头像菜单、Preferences、Access Tokens。
- 建议命名为 `Ironforge Workbench`，权限选择 `api`。
- 提醒 Token 通常只显示一次且不可分享。

### SSH 私钥路径

- 说明私钥用于上传、拉取、Clone 和 Tag。
- 展示常见路径 `C:\Users\用户名\.ssh\id_ed25519`。
- 明确选择没有 `.pub` 后缀的文件。
- 说明 `.pub` 文件应添加到 GitLab 的 SSH Keys 页面，私钥不能上传或分享。

### SSH 私钥密码

- 说明这是生成 SSH Key 时自行设置的密码，不是 GitLab 密码。
- 没设置则留空。
- 忘记后无法找回，需要重新生成 SSH Key。

## Visual Treatment

- 问号使用圆形图标按钮，紧邻字段标题，不使用带文字的胶囊按钮。
- 展开内容使用低强调背景和紧凑排版，不创建嵌套卡片。
- 移动端保持完整宽度，长路径允许换行。

## Testing

- 验证三个问号按钮均可访问。
- 验证点击后显示对应内容，再次点击后收起。
- 验证 Token 输入仍默认隐藏，现有保存和文件选择行为不受影响。
