# Tag And History Implementation Plan

**Goal:** 在 MR 前安全创建关键版本 Tag，并分类展示 GitLab 历史。

**Architecture:** 扩展 MR 请求携带可选 Tag，由服务端以幂等方式保证 Tag 指向当前提交后再创建 MR。历史 API 聚合 commits、tags 与 merged merge requests，前端按事件类型显示。

## Tasks

1. 为 MergeRequestDraft、草稿存储和编辑页面增加可选 Tag 字段及验证测试。
2. 在 Git 操作层实现“同提交幂等、不同提交冲突”的 Tag 保证函数及测试。
3. 调整交付工作流，验证执行顺序为 Tag 检查/创建/推送后创建 MR，并覆盖失败重试。
4. 扩展 GitLab 客户端读取 Tags 和已合并 MR，历史 API 聚合去重排序。
5. 调整历史类型、图标、颜色和说明，覆盖分支、Tag、合并三种表现。
6. 运行完整单元测试、静态检查、公开发布扫描和 Windows 打包。
