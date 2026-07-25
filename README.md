# Ironforge Engineer Workbench

面向结构工程师的本地 GitLab 与 Ironforge 工作台。当前版本可以扫描硬件仓库、选择或创建交付分支、自动生成 `charge.json`、Commit/Push、创建可选版本 Tag，并通过带审核人的 GitLab MR 提交 Ironforge 发布审核。

## 本地运行

```powershell
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1
```

打开 `http://127.0.0.1:5173/workspace`。

开发环境默认读取：

```text
E:\BaiduSyncdisk\Gitlab\Dragon\lens-mechanics
```

读取其他仓库时，在启动前设置环境变量：

```powershell
$env:IRONFORGE_REPOSITORY_PATH='E:\path\to\repository'
npm.cmd run dev -- --host 127.0.0.1
```

Git 调用使用参数数组执行，不通过 shell 拼接仓库内容。真实 Commit、Push、Tag、附件上传和 MR 创建仍应由用户逐次确认；开发测试只使用临时模拟仓库。

## 交付流程

1. 选择已有分支，或从当前版本创建新分支。
2. 勾选本次 Ironforge 交付包，自动更新 `charge.json`。
3. 填写同步注释；需要存档时选择唯一版本 Tag，例如 `T2-v1`。
4. 确认后 Commit，并 Push 分支和可选 Tag。
5. 独立填写 MR 标题与 Markdown 说明，可添加飞书文档链接、PDF 和图片。
6. 选择审核人并提交 MR。管理员合并 MR 后即完成 Ironforge 发布。

Tag 名称不可复用或强制覆盖。日常同步不必创建 Tag；普通阶段版本使用 `T2-v1`、`T2-v2`，最终阶段版本再使用 `T2`。

## 验证

```powershell
npm.cmd test -- --run
npm.cmd run build
npm.cmd run lint
npm.cmd run test:e2e
```

Playwright 使用 Microsoft Edge，覆盖桌面、平板和手机视口。
