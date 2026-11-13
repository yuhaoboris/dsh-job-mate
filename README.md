# 职伴 · DeepSeek Harness 工作台

[job-mate](https://github.com/yuhaoboris/job-mate) 的可视化工作台：提供一份简历，和 Agent 确认求职偏好，然后查看职位筛选、HR 沟通、面试邀约和待决定事项。

插件直接携带上游原版技能。工作流和数据规则只在 job-mate 维护；插件与独立技能通过同一个核心读写同一工作区。

## 安装

在 DeepSeek Harness 中打开「插件 → 添加插件」，输入以下 **GitHub 仓库地址**，然后点击「安装」：

```text
https://github.com/yuhaoboris/dsh-job-mate
```

无需下载或解压安装包。当前通过 GitHub 分发，请填写上面的完整地址，不要只填 npm 包名。

也可以使用 DSH CLI 安装到 `web` profile：

```sh
dsh plugin --profile web add https://github.com/yuhaoboris/dsh-job-mate
```

GitHub 仓库地址和本地目录均属于 [DSH 官方支持的安装来源](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)。开发时可在同一个「添加插件」输入框填写本项目的绝对目录路径。

## 更新

侧栏「职伴」会提示可用的新版本。打开工作台可查看更新日志，点击「更新插件」由 DSH 安装；出现「待重启」后，退出并重新打开 DSH。更新保留原求职工作区，需先结束正在执行的求职任务。

启动后检查 GitHub 正式发布，成功结果缓存六小时；也可点击「检查更新」立即检查。检查只读取本仓库公开发布信息，不发送简历、偏好或求职记录。本地源码安装通过 DSH 插件管理更新。

首次获得此更新功能，需将已安装的插件通过 DSH「插件」页卸载，再使用上面的仓库地址安装并重启。此操作不删除 `~/.job-mate` 求职工作区。

## 开始使用

1. 打开侧栏「职伴」，选择 PDF、DOCX、HTML、TXT 或 Markdown 简历。
2. 点「继续对话」，在会话中发送准备好的任务。Agent 读取简历，询问缺少的偏好，确认后保存。
3. 回到工作台查看进展。筛选与处理消息按钮打开会话草稿；默认先只读，发消息需本人明确授权。

需要 Harness、Python 3.9+ 和可见桌面操作能力。插件需要 Node.js 22.13+（Harness 宿主提供）；如 Python 不在 PATH，可由 Agent 配置 `JOB_MATE_PYTHON` 为可执行文件路径。登录、验证码、系统权限由本人完成。

## 数据和隐私

默认工作区 `~/.job-mate`，与独立技能共用；需要指定位置时，可由 Agent 设置 `JOB_MATE_HOME`。读取失败或数据格式不受支持时停止操作并保留原文件。

简历、个人事实和历史只存工作区，界面不另建业务副本。Agent 的模型服务和日志仍可能处理这些内容。面板每十秒读取记录，不轮询招聘网站；“送达”是 Agent 当时记录的证据，不是平台实时回执。没有 IM 通知。

## 开发

```sh
npm ci
npm test
npm run check:upstream
npm pack
```

更新上游（上游须先提交）：

```sh
node scripts/sync-upstream.mjs --source /path/to/job-mate
```

`upstream-lock.json` 记录版本、提交和所有原版技能文件 SHA-256。CI 检查哈希，避免插件重新分叉。开发中可临时 `--development`，这种快照不能作为正式上游版本发布。

- `index.js`：Harness Host、工具与原版技能注册。
- `client.js`：简历入口、求职摘要、记录详情与待决定事项。
- `lib/core.js`：调用上游数据核心，不复制业务逻辑。
- `lib/updates.js`：公开发布检查、版本比较与 DSH 安装适配。
- `lib/service.js`：宿主工作区、简历上传和会话草稿适配。
- `lib/http.js` / `lib/auth.js`：通过 Connection 认证访问面板数据。
- `lib/resume*.js`：隔离线程提取文本，不执行 HTML、不读取外部资源。

[架构与接口依据](docs/design.md) · [界面验证清单](docs/ui.md) · [贡献指南](CONTRIBUTING.md) · [安全说明](SECURITY.md)

本项目采用 [Apache-2.0](LICENSE) 许可证。所含 job-mate 原版技能保留[上游许可证](vendor/job-mate/LICENSE)。
