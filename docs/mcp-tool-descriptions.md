# MCP Tool Descriptions

这份文档给未来的 MCP 封装使用。目标是提前把 tool description 写清楚，避免把行为约束只放在 system prompt 里。

## 总体原则

- 工具名用业务语义，不要用实现细节命名
- description 要写清楚“什么时候用”和“什么时候不要用”
- 参数 schema 只暴露业务输入，不暴露内部文件结构
- MCP tool 应复用 `src/application/timeline/*`，不要直接复制 CLI 逻辑

## 推荐工具列表

### `timeline_write_day`

用途：
- 写入或增量更新某一天的 timeline 数据

何时使用：
- 用户要求补充、修改、覆盖某天的事件

何时不要用：
- 用户只是想预览现有 dashboard
- 用户要求修改 dashboard 实现代码

输入建议：
- `date`: `YYYY-MM-DD`
- `mode`: `merge | replace`
- `events`: 事件数组
- `finalize`: 可选布尔值

description 示例：

```text
Write or merge timeline events for a single day. Use this tool when the task is to add or update timeline data for one date. Do not use it for code changes or dashboard rendering tasks. All events must stay within the given date; cross-day events are invalid.
```

### `timeline_build_dashboard`

用途：
- 构建 dashboard 静态产物

何时使用：
- 用户要求生成最新 dashboard
- 写入数据后需要刷新静态产物

description 示例：

```text
Build the local timeline dashboard site from the current source data. Use this after timeline data changes when a fresh static build is needed.
```

### `timeline_serve_dashboard`

用途：
- 启动本地静态页面服务

何时使用：
- 用户要求本地打开可访问的 dashboard 地址

description 示例：

```text
Start a local HTTP server for the built timeline dashboard and return the local URL. Use this when the user needs a browsable dashboard.
```

### `timeline_dev_server`

用途：
- 启动带自动重建的开发预览

何时使用：
- 用户需要持续查看 dashboard 变更

description 示例：

```text
Start the local timeline development server with automatic rebuilds when source files or timeline data change. Use this for iterative editing and preview workflows.
```

### `timeline_capture_screenshot`

用途：
- 构建页面、临时起服务并截图

何时使用：
- 用户要求导出 dashboard 截图

何时不要用：
- 用户只想要可访问链接，不需要图片

输入建议：
- `outputFile`，例如 `./timeline-shot.png`
- `selector`
- `width`
- `height`
- `sidePadding`

description 示例：

```text
Capture a screenshot of the local timeline dashboard. This tool handles build, temporary local serving, page load, and screenshot capture. Use it when the user needs an image output instead of only a live preview URL.
```

局部截图约束：

- 优先使用受控 selector，而不是让模型自由生成 CSS
- 当前内置值建议固定为：
  - `timeline`
  - `analytics`
  - `events`
- 只有这些值都不满足时，才允许透传自定义 CSS selector

自然语言识别建议：

- “截时间轴” / “只截 timeline” -> `timeline`
- “截类别明细趋势” / “截分析区” -> `analytics`
- “截事件” / “只截事件列表” -> `events`

## CLI 和 MCP 的统一约束

无论调用入口是 CLI 还是 MCP，都应该遵守：

- 优先调用高层业务动作，而不是读源码推断行为
- 写入数据时禁止跨天事件
- 如果现有命令或 tool 已能完成任务，不要改实现代码
- 只有在需要修复 bug 或扩展能力时，才进入源码阅读和代码修改路径
