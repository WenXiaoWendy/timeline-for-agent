# Timeline for Agent

本地优先的 agent 时间轴工具：

- 增量写入 `facts + taxonomy`
- 构建静态 dashboard
- 本地预览和热更新
- Playwright 截图

适用前提：

- agent 上下文里有明确时间戳
- agent 能执行命令、读写文件

## CLI

```bash
timeline-for-agent write --date 2026-04-06 --stdin
timeline-for-agent build
timeline-for-agent serve
timeline-for-agent dev
timeline-for-agent screenshot
```
