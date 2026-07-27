# ironforge-workbench

一款面向普通工程师的中文 Windows 桌面工具。它把 GitLab 项目上传、下载和工程交付整理成逐步引导，尽量避免要求用户理解复杂的 Git 命令。

## 下载最新版

[点击这里下载最新版 Windows 安装包](https://github.com/DocJ2000/ironforge-workbench/releases/latest/download/ironforge-workbench-Setup.exe)

这是尚未进行代码签名的公开测试版本。Windows 第一次运行安装包时可能显示安全提醒，请确认下载地址来自本仓库。

## 能做什么

- 从 GitLab 下载已有项目，并选择保存到电脑中的位置；
- 把本地项目更新上传到指定分支；
- 管理多个项目，每次操作前明确选择项目；
- 用文件夹层级查看交付内容，并标记新增和更改；
- 整理 OUTPUT 交付包并创建合并请求；
- 提供独立的铁炉堡入口；
- 安装包内置 Git，不要求用户另外安装；
- 只有用户主动点击确认后，软件才会执行上传、下载、提交或升级。

## 第一次使用

1. 下载并安装 `ironforge-workbench`。
2. 打开“账户与链接”，填写自己单位提供的服务器地址。
3. 按字段旁边的问号查看访问码和 SSH 身份的详细获取步骤。
4. 在 GitLab 页面添加项目。
5. 选择“从服务器下载到这台电脑”或“把这台电脑的内容上传到服务器”。

软件不会替用户自动提交工程文件。每次真正写入服务器之前，都会展示操作内容并要求用户确认。

## 添加项目

有两种常见情况：

- **GitLab 已经有项目**：从项目页面复制 SSH 地址，在软件中选择本地保存位置，然后下载。
- **电脑里已经有项目文件**：选择现有文件夹，填写该项目的 SSH 地址，让软件建立本地文件夹与 GitLab 项目的联系。

项目 SSH 地址通常可以在 GitLab 项目页面通过 `Code → SSH` 获取，格式类似：

```text
git@your-gitlab.example.com:group/project.git
```

请先向管理员确认自己拥有该项目的权限。不要把 SSH 私钥、访问码或密码发给其他人。

## 在线升级

在“账户与链接”页面中找到软件更新：

1. 点击检查更新；
2. 软件发现新版本后，由用户决定是否下载；
3. 下载完成后，再由用户决定是否安装；
4. 安装前会备份本软件的设置和加密凭据；
5. 升级不会修改或删除用户选择的工程项目文件夹。

## 隐私与公开版本

本仓库的公开版本不包含：

- 公司服务器地址；
- 真实项目文件、图纸或 BOM；
- 个人账号、密码或访问码；
- SSH 私钥；
- 浏览器 Cookie；
- 公司内部配置。

这些信息只由用户在自己的电脑上填写，并保存在本机。公开反馈问题时，也请先移除截图和日志中的项目名称、服务器地址及个人信息。

## 本地开发

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

测试项目操作时，请使用 `IRONFORGE_REPOSITORY_PATH` 指向一次性的模拟仓库，不要对真实工程项目运行写入测试。

## 发布前检查

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run audit:public-release
```

## 生成 Windows 安装包

```powershell
$env:GH_OWNER='你的 GitHub 用户名'
$env:GH_REPO='ironforge-workbench'
npm.cmd run package:win
```

正式发布时应通过构建环境提供 GitHub 发布凭据，禁止把访问令牌写入源码。面向更大范围分发前，建议配置 Windows 代码签名。
