# 2.0 工作台设计

job-mate 是唯一业务上游。插件携带两个完整 skill，保留原版 SKILL.md、references、Python 核心和许可证；`upstream-lock.json` 固定提交与每个文件哈希。更新通过显式同步，运行时不抓取可变的远端代码。

用户通过 DSH「插件 → 添加插件」输入 GitHub 仓库地址安装；CLI 使用同一个安装实现。仓库直接提供可运行的 JavaScript 与 `cordis.patch.yml`，不要求用户先下载或构建安装包。本地目录安装用于开发调试。

面板 HTTP 与 Agent 工具都调用同一 Python JSON 入口。数据库事务在上游负责；插件没有 profile/ledger 的第二种写模型。Host 只处理认证、宿主会话、文档文本提取和 UI。

首屏提供简历，下一步交给 Agent 访谈。已配置时展示偏好摘要、唯一会话数量、等待回复、面试邀约、待决定事项与历史。状态、指标和详情来自一次完整 snapshot，刷新过期响应丢弃；认证失败隐藏旧数据，普通错误保留并标明旧快照，禁用任务入口。

所有会话入口调用 `uiWorkspace.startSession(workspaceId, {prompt, whenDraftExists:'append'})`，保留现有草稿；兼容宿主的同步返回与 Promise 返回。不会偷偷提交 prompt。界面不操作 BOSS、不从按钮点击推导平台外发授权。

简历解析在 worker 中，有 5 MB/30 页/10 万字符/20 秒上限。PDF 扫描页或乱码失败时要求可读版本；不把部分文本当完整事实。上传原件通过上游 stage_resume 保存；内容只在必要时进入用户自己的 Agent 会话。HTML 只提取纯文本，不渲染执行。

## 官方依据（核对于 2026-11-13）

- [插件发布清单](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)：dsh.bundle.patch、Cordis 安装项。
- [技能目录](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md)：技能文件与来源。
- [客户端工作区](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-workspace/README.md)：工作区会话入口与草稿策略。
- [插件管理器客户端](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/src/client/index.ts)：sidebar.panellist 与 main 插槽。
- [baoyu-design](https://github.com/JimLiu/baoyu-design)：借鉴原版技能直接随 Harness 插件分发、界面与 Agent 共享数据的结构。未复制其设计素材、技能正文或第三方编辑器。

## 限制

Python 是额外宿主运行依赖；当前插件会明确报告缺失，并由 Agent 按用户安装意图补齐。桌面操作能力由宿主提供，离线数据测试不能证明真实 BOSS 可用。每个工作区支持一个已核对的求职账号。

## 版本更新

`lib/updates.js` 读取本仓库 GitHub 最新稳定 Release；成功缓存六小时、失败退避五分钟，手动检查可重试。公共响应有十秒超时与 512 KiB 上限。侧栏和面板共用客户端状态与一个轮询，不必打开工作台才能发现更新。

安装仅由已通过 Connection 认证的 POST 触发，不接受客户端传入 URL、包名或命令。Host 确认当前插件来自本仓库、没有运行中的求职任务后，将 Release tag 解析为完整提交，调用已核对的 `pluginManager.installBundle(spec, {enabled, saveExact, expected:{name,version}})`。DSH 校验目标包并负责安装、失败恢复及脚本授权，插件不拼 shell、不自动批准脚本。已加载版本与 DSH 发现的已安装版本分开，用来识别刷新页面后的「待重启」。更新服务不改动求职数据库或上游文件。

接口依据：[InstallBundleOptions / ChangeResult](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/src/types.ts)。核对本机 DSH 0.2.2-rc.2 的同一实现；安装来源为开发目录时仅提供发布信息，避免覆盖开发源码。
