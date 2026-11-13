# 贡献指南

先读 [架构](docs/design.md) 和 [AGENTS.md](AGENTS.md)。求职工作流与数据规则在 [job-mate](https://github.com/yuhaoboris/job-mate) 修改；本项目维护 Harness 适配与工作台。

修改上游后先提交，再用 `node scripts/sync-upstream.mjs --source /path/to/job-mate` 同步完整技能。提交生成文件和 `upstream-lock.json`，不要手改上游副本。

提交前运行 `npm test`、`npm run check:upstream`、`npm pack --dry-run`。使用临时目录和合成资料；真实 Harness 检查使用隔离 profile。测试不联系招聘者、不修改真实求职工作区。报告中区分离线测试、宿主验证与真实平台验证。

公开文档以当前安装与使用为准。首次公开版本之后的 breaking change 应在发布说明中写清受影响行为、数据兼容性和用户需要采取的操作。

本地开发技能、编辑器、内部画板与记录不随仓库或安装包分发。发布前检查源码、安装包和全部可达 Git 历史中的私人信息及第三方许可证。贡献需有权按本项目 Apache-2.0 许可证分发。
