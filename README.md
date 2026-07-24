# Ironforge Engineer Workbench

面向结构工程师的本地 GitLab 与 Ironforge 工作台。当前版本以只读方式扫描真实硬件仓库，展示分支、工作区修改、`charge.json` 交付包和版本历史；Commit、Push、MR 与 Ironforge 写操作仍保持禁用。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

打开 `http://127.0.0.1:5173/overview`。

开发环境默认读取：

```text
E:\BaiduSyncdisk\Gitlab\Dragon\lens-mechanics
```

读取其他仓库时，在启动前设置环境变量：

```powershell
$env:IRONFORGE_REPOSITORY_PATH='E:\path\to\repository'
npm.cmd run dev -- --host 127.0.0.1
```

本地 API 只有一个只读入口：`GET /api/repository`。Git 调用使用参数数组执行，不通过 shell 拼接仓库内容。

## 验证

```powershell
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
npm.cmd run test:e2e
```

Playwright 使用 Microsoft Edge，覆盖桌面、平板和手机视口。
