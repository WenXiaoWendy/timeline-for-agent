<div align="center">

# Timeline for Agent

让 agent 在长期对话里自然沉淀用户的生活轨迹，并在需要时生成可筛选、可截图的时间轴报表。

当前先开放 CLI，MCP 能力后续再补。

[![License: MIT](https://img.shields.io/badge/License-MIT-8b6f47)](./LICENSE)
[![Node >=22](https://img.shields.io/badge/Node-22%2B-3C873A)](./package.json)
[![CLI Only](https://img.shields.io/badge/Interface-CLI-f4a261)](#agent-guide)
[![Playwright Screenshot](https://img.shields.io/badge/Screenshot-Playwright-6c8ae4)](#screenshots)

<p>
  <a href="#preview">预览</a> ·
  <a href="#user-guide">用户使用</a> ·
  <a href="#agent-guide">Agent 接入</a> ·
  <a href="#screenshots">截图规则</a>
</p>

</div>

> 重要前提：agent 上下文里必须带有明确对话时间戳，否则写入出来的时间数据会不准。如果你手头还没有满足这个前提的 agent，可以直接使用我的微信生活助手项目：[wechat-codex-life-assistant](https://github.com/WenXiaoWendy/wechat-codex-life-assistant)。

它适合这样的场景：

- agent 在和用户持续聊天，信息会不断累积，但生活片段很容易散掉
- 你希望这些片段被稳定记录成时间轴，而不是埋在长对话里
- 当用户想看某一天、某一周、某个月，或某个分类、某个明细时，可以立刻生成对应报表或截图

<a id="preview"></a>
## Dashboard 预览

主视图示例：

![Timeline Dashboard](./examples/timeline-dashboard-main-view.png)

局部筛选示例：

需要编码类别的分析局部截图时，可描述为“截 2026-04 的月视图分析区，筛到工作 > 编码”：

![2026-04 月视图中工作 > 编码的分析局部截图](./examples/screenshot-combos/month-2026-04-work-coding-analytics.png)

其他局部截图和排列组合示例可在 `examples/` 查看：

- `timeline-dashboard-timeline-view.png`
- `timeline-dashboard-analytics-view.png`
- `timeline-dashboard-events-view.png`
- `screenshot-combos/week-main-default.png`
- `screenshot-combos/week-analytics-default.png`
- `screenshot-combos/month-2026-04-work-coding-analytics.png`
- `screenshot-combos/week-rest-sleep-events.png`
- `screenshot-combos/day-2026-04-05-timeline.png`
- `screenshot-combos/month-2026-04-analytics.png`

<a id="user-guide"></a>
## 用户使用

### 最常见的两种用法

1. 让 agent 在对话中持续写入时间轴，需要时再截图给用户
2. 自己在本地长期挂一个 dashboard，随时打开查看，不依赖 agent 临时截图

### 如果想长期开着本地页面随时查看

如果你不想每次都依赖 agent 触发截图，而是希望自己在本地随时打开 dashboard 看当前数据，最直接的方式是长期运行下面两个命令中的一个：

```bash
timeline-for-agent dev
timeline-for-agent serve
```

区别是：

- `timeline-for-agent dev`
  适合开发和频繁改数据，会监听源码和数据文件，自动重建并热刷新
- `timeline-for-agent serve`
  适合稳定查看，直接把已经构建好的静态页面挂起来，不做监听

常见用法：

```bash
timeline-for-agent build
timeline-for-agent serve --port 4317
```

如果你长期只想“查看”而不是“边改边看”，优先用 `serve`。如果你会一边改数据一边观察效果，优先用 `dev`。

### 安装与启动

环境前提：

- Node.js `>=22`
- 已执行 `npm install`
- 如果需要截图，本机需要可用的 Chromium / Chrome / Edge，或可被 `playwright-core` 发现的浏览器

最快启动方式：

```bash
npm install
npm run timeline-dev
```

默认会启动在 `http://127.0.0.1:4317`。

如果不想走 `npm scripts`，也可以直接用：

```bash
node ./bin/timeline-for-agent.js dev
```

### 数据放在哪里

默认状态目录在 `~/.timeline-for-agent/timeline/`，主要文件包括：

- `timeline-state.json`
  单一权威状态快照
- `timeline-taxonomy.json`
  分类、子类和 eventNode
- `timeline-facts.json`
  真实时间轴事件数据
- `site/`
  `build` 产出的静态页面
- `shots/`
  `screenshot` 默认输出目录

CLI 会优先读取这两个 `.env` 位置：

- 当前工作目录下的 `.env`
- `~/.timeline-for-agent/.env`

常用环境变量：

- `TIMELINE_FOR_AGENT_STATE_DIR`
- `TIMELINE_FOR_AGENT_DIR`
- `TIMELINE_FOR_AGENT_PORT`
- `TIMELINE_FOR_AGENT_CHROME_PATH`
- `TIMELINE_FOR_AGENT_TAXONOMY_FILE`
- `TIMELINE_FOR_AGENT_FACTS_FILE`
- `TIMELINE_FOR_AGENT_SITE_DIR`

### 当前数据是怎么来的

- 如果真实 `facts` 非空，dashboard 会直接使用真实数据
- 如果真实 `facts` 为空，会回退到 [demo-facts.json](./examples/demo-facts.json)
- `dev` 模式下修改真实数据文件会自动重建；demo 场景下修改 `examples/demo-facts.json` 也会自动重建

### 当前分类是怎么来的

- 当前分类来自 `timeline-taxonomy.json`
- 如果没有自定义 taxonomy，会先使用项目内置的默认 taxonomy
- agent 在写入时也可以顺带新增 `eventNode`，这些新增项会进入 taxonomy，并留下 proposal 记录

### 我想改分类怎么办

- 如果只是想让 agent 以后复用已有分类，可以先让它执行 `timeline-for-agent categories`
- 如果是新增或调整 eventNode，可以让 agent 按现有流程写入，它会留下 proposal，之后再检查 `timeline-for-agent proposals`
- 如果你想手动改分类体系，直接修改 `timeline-taxonomy.json` 即可；改完后重新执行 `dev` 或 `build`

### 用户常用操作

- `timeline-for-agent build`
  构建静态 dashboard 到 `site/`
- `timeline-for-agent serve [--port 4317]`
  启动静态页面服务
- `timeline-for-agent dev [--port 4317]`
  监听源码和数据并热刷新
- `timeline-for-agent screenshot`
  先构建，再临时起本地服务并截图

### 局部截图怎么描述

- `timeline-for-agent screenshot` 默认截整页
- 如果只截局部，优先使用受控 selector，而不是临时编 CSS
- 如果要在截图前切换日/周/月、时间范围、分类或明细，优先用结构化参数，不要让模型自己编 Playwright 步骤

当前内置区域：

- `main`
  主视图整页
- `timeline`
  时间轴区域
- `analytics`
  类别分布、子类明细和趋势三块分析区
- `events`
  事件明细区

推荐的自然语言描述：

- “截主视图” / “截整页”
- “截时间轴” / “只截 timeline”
- “截类别明细趋势” / “截分析区”
- “截事件” / “只截事件列表”
- “截 2026-04-05 的日视图时间轴”
- “截 2026-04 的月视图分析区”
- “截工作 > 编码的分析区”
- “截工作 > 编码的事件列表”

<a id="agent-guide"></a>
## Agent 接入

### 命令入口

```bash
timeline-for-agent help
timeline-for-agent categories
timeline-for-agent proposals
timeline-for-agent read --help
timeline-for-agent write --help
timeline-for-agent read --date 2026-04-06
timeline-for-agent write --date 2026-04-06 --stdin
timeline-for-agent build
timeline-for-agent serve
timeline-for-agent dev
timeline-for-agent screenshot --help
timeline-for-agent screenshot
```

如果仓库还没全局安装，也可以把上面的命令替换成：

```bash
node ./bin/timeline-for-agent.js <命令>
```

### 基本原则

- 优先调用现有 CLI，不要先读源码理解用法
- 只有在命令报错、用户明确要求改实现、或需要新增能力时，才进入读源码路径
- 不推荐直接读取或修改原始 JSON 文件

### 读取和修改流程

- 如果不确定该复用哪个 category / subcategory / eventNode，先执行 `timeline-for-agent categories`
- 如果是补充新内容，且上下文已经足够、目标日期明确、写入位置也明确，可以直接执行 `timeline-for-agent write`
- 如果是修改、删除、覆盖或替换已有内容，先执行 `timeline-for-agent read --date YYYY-MM-DD`
- `read` 只返回目标日期的受控事件数据，不返回完整 facts 或 taxonomy
- 确认要改的事件后，再执行 `timeline-for-agent write`
- 如果要排查新增了哪些 eventNode 提案，执行 `timeline-for-agent proposals`

### 写入约束

- 所有 `events` 都必须落在对应 `date` 当天内，不能跨天
- 睡眠如果跨过 `00:00`，需要拆成两段写：
  一段是当天凌晨的睡眠，一段是当天夜间入睡后的睡眠
- 不要写一条从当天晚上直接跨到第二天早上的事件

<a id="screenshots"></a>
### 截图规则

- `screenshot` 会先执行一次 `build`，再临时起服务后截图
- 默认输出到 `~/.timeline-for-agent/timeline/shots/`
- 如果浏览器路径无法自动发现，可显式设置 `TIMELINE_FOR_AGENT_CHROME_PATH`
- 只要用户想看某个分类或明细的时间分布，优先使用 `--selector analytics`
- 只有明确要看事件卡片列表时，才使用 `--selector events`

示例：

```bash
timeline-for-agent screenshot --selector main
timeline-for-agent screenshot --selector timeline
timeline-for-agent screenshot --selector analytics
timeline-for-agent screenshot --selector events
timeline-for-agent screenshot --range day --date 2026-04-05 --selector timeline
timeline-for-agent screenshot --range month --month 2026-04 --selector analytics
timeline-for-agent screenshot --range week --category 工作 --detail 编码 --selector analytics
timeline-for-agent screenshot --range week --category 工作 --detail 编码 --selector events
```

### 进一步约束文档

- 共享 agent 约束见 [agent-instructions.md](./docs/agent-instructions.md)
- 未来 MCP 的 tool description 模板见 [mcp-tool-descriptions.md](./docs/mcp-tool-descriptions.md)
