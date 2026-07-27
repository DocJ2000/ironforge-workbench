# 工程交付助手

一个面向普通工程师的中文 Windows 桌面工具，用更容易理解的方式完成 GitLab 项目同步和工程交付。

## 主要功能

- 把 GitLab 上的项目下载到自己选择的本地文件夹；
- 记住并管理多个本地项目；
- 使用逐步引导完成上传和下载；
- 整理交付包并创建合并请求；
- 使用 Windows 系统加密保存访问凭据；
- 安装包内置 Git，用户不需要另外安装；
- 只有用户明确点击后，才会检查、下载或安装 GitHub Releases 更新。

公开版本不包含任何公司服务器地址、真实项目资料、个人凭据或 SSH 私钥。每位用户在自己的电脑上填写本单位的连接信息。

## 本地开发

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

测试项目操作时，请使用 `IRONFORGE_REPOSITORY_PATH` 指向一次性的模拟仓库。

## 完整检查

```powershell
npm.cmd test -- --run
npm.cmd run lint
npm.cmd run audit:public-release
```

自动化测试只使用临时仓库，不要对真实工程项目运行写入测试。

## 生成 Windows 安装包

构建时指定公开的 GitHub Releases 仓库：

```powershell
$env:GH_OWNER='你的GitHub用户名'
$env:GH_REPO='engineering-delivery-workbench'
npm.cmd run package:win
```

正式上传还需要通过构建环境提供 GitHub 发布凭据，禁止把访问令牌写入源码。

大范围分发前建议配置 Windows 代码签名，减少系统安全提示。
