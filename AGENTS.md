# dsh-job-mate 2.0

本项目是 job-mate 的 DeepSeek Harness 适配器和工作台。业务规则、授权、状态与记录语义只在上游 job-mate 维护。

- `skills/` 与 `vendor/job-mate/` 是未经修改的上游快照；用 `scripts/sync-upstream.mjs` 更新，禁止手改。发布快照必须记录已提交上游的 commit 与逐文件哈希。
- 通过 `lib/core.js` 调用上游 Python 核心，JSON 走标准输入，禁止 shell 拼接私人内容。
- 首次使用只提供简历，再进入 Agent 对话确认偏好。界面不要求填写基础资料表单；任务按钮打开可编辑草稿，不自动发送用户消息或平台消息。
- HTTP 必须通过 Harness Connection 认证；接口失效时隐藏旧私人资料。只用已核对的宿主 API。
- 验证使用临时目录与合成数据。`npm test`、`npm run check:upstream`、`npm pack --dry-run`；真实 Harness 验证需隔离 profile，不修改用户默认配置、不操作 BOSS。
- 个人数据、运行日志、内部开发材料放工作区或 `.private/`，不提交。原版 Apache-2.0 许可证随包分发。
- 公开文档说明当前安装与使用，不写内部试验版本历史。首次公开版本之后的 breaking change 必须说明影响和用户需要采取的操作。
- 本地开发技能、设计工具与内部画板不作为项目源码分发；公开前核对当前文件和全部可达历史的隐私与许可。
