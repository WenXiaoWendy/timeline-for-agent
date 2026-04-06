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
timeline-for-agent help
timeline-for-agent write --help
timeline-for-agent write --date 2026-04-06 --stdin
timeline-for-agent build
timeline-for-agent serve
timeline-for-agent dev
timeline-for-agent screenshot
```

## 写入约束

- 所有 `events` 都必须落在对应 `date` 当天内，不能跨天
- 睡眠如果跨过 `00:00`，需要拆成两段写：
  一段是当天凌晨的睡眠，一段是当天夜间入睡后的睡眠
- 不要写一条从当天晚上直接跨到第二天早上的事件

## Agent 集成

- 接入 agent 时，优先让模型调用现有 CLI，不要先读源码理解用法
- 只有在命令报错、用户要求改实现、或需要新增能力时，才进入读源码路径
- 推荐的共享约束写法见 [agent-instructions.md](./docs/agent-instructions.md)
- 未来封装 MCP 时，tool description 模板见 [mcp-tool-descriptions.md](./docs/mcp-tool-descriptions.md)
