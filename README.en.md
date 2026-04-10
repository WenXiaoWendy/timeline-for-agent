<div align="center">

[Chinese](./README.md) · [English](./README.en.md)

# Timeline for Agent

Turn long-running conversations into a structured life timeline, then generate filterable dashboard views and screenshots on demand.

[![License: AGPLv3](https://img.shields.io/badge/License-AGPLv3-b31b1b)](./LICENSE)
[![Node >=22](https://img.shields.io/badge/Node-22%2B-3C873A)](./package.json)
[![CLI Only](https://img.shields.io/badge/Interface-CLI-f4a261)](#agent-guide)
[![Playwright Screenshot](https://img.shields.io/badge/Screenshot-Playwright-6c8ae4)](#screenshots)

<p>
  <a href="#preview">Preview</a> ·
  <a href="#user-guide">User Guide</a> ·
  <a href="#agent-guide">Agent Guide</a> ·
  <a href="#screenshots">Screenshots</a>
</p>

</div>

> Important prerequisite: the upstream agent must already know when each message happened. If the conversation has no explicit timestamps, the generated time data will be unreliable. If you want a ready-to-use WeChat bridge that already solves this part, see [cyberboss](https://github.com/WenXiaoWendy/cyberboss).

Timeline for Agent is built for this kind of workflow:

- an agent accumulates knowledge about a user's routines, work, body state, and daily rhythm across long conversations
- those observations need a structured output instead of staying buried inside chat history
- when the user wants to inspect a day, week, month, category, or detail slice, the agent should be able to return a clean dashboard or screenshot immediately

<a id="preview"></a>
## Preview

Main dashboard view:

![Timeline Dashboard](./examples/timeline-dashboard-main-view.png)

Filtered analytics example:

![Month analytics filtered to Work > Coding](./examples/screenshot-combos/month-2026-04-work-coding-analytics.png)

More examples are available under `examples/`:

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
## User Guide

### Two common ways to use it

1. Let an agent keep writing timeline data during conversation, then ask for screenshots only when needed.
2. Keep a local dashboard running all the time so you can inspect the data directly without asking the agent to capture a screenshot.

### If you want a dashboard that stays open locally

If you want the dashboard available at any time, run one of these commands:

```bash
timeline-for-agent dev
timeline-for-agent serve
```

Difference:

- `timeline-for-agent dev`
  Best for development or frequent data edits. It watches source and data files, rebuilds, and hot reloads.
- `timeline-for-agent serve`
  Best for stable viewing. It serves the built static site without watching files.

Common flow:

```bash
timeline-for-agent build
timeline-for-agent serve --port 4317
```

If you mostly want to inspect data, prefer `serve`. If you are changing data and code while observing the result, prefer `dev`.

### Installation and startup

Requirements:

- Node.js `>= 22`
- dependencies installed with `npm install`
- Chrome / Chromium / Edge if you want screenshots, or any browser discoverable by `playwright-core`

Fastest start:

```bash
npm install
npm run timeline-dev
```

The default local address is `http://127.0.0.1:4317`.

If you prefer not to use npm scripts:

```bash
node ./bin/timeline-for-agent.js dev
```

### Where the data lives

The default state directory is `~/.timeline-for-agent/timeline/`.

Important files:

- `timeline-state.json`
  single authoritative state snapshot
- `timeline-taxonomy.json`
  categories, subcategories, and event nodes
- `timeline-facts.json`
  real timeline event data
- `site/`
  static dashboard output from `build`
- `shots/`
  default output directory for `screenshot`

The CLI reads `.env` from these two locations first:

- the current working directory
- `~/.timeline-for-agent/.env`

Useful environment variables:

- `TIMELINE_FOR_AGENT_LOCALE`
- `TIMELINE_FOR_AGENT_STATE_DIR`
- `TIMELINE_FOR_AGENT_DIR`
- `TIMELINE_FOR_AGENT_PORT`
- `TIMELINE_FOR_AGENT_CHROME_PATH`
- `TIMELINE_FOR_AGENT_TAXONOMY_FILE`
- `TIMELINE_FOR_AGENT_FACTS_FILE`
- `TIMELINE_FOR_AGENT_SITE_DIR`

Language switching:

```bash
TIMELINE_FOR_AGENT_LOCALE=en npm run timeline-serve
TIMELINE_FOR_AGENT_LOCALE=zh-CN npm run timeline-serve
```

The same variable also applies to:

```bash
TIMELINE_FOR_AGENT_LOCALE=en npm run timeline-dev
TIMELINE_FOR_AGENT_LOCALE=zh-CN npm run timeline-build
TIMELINE_FOR_AGENT_LOCALE=en npm run timeline-screenshot -- --selector main
```

### Where the current demo data comes from

- if real `facts` exist, the dashboard uses them directly
- if real `facts` are empty, it falls back to locale-specific demo data
  - English: [demo-facts.json](./examples/demo-facts.json)
  - Chinese: [demo-facts.zh-CN.json](./examples/demo-facts.zh-CN.json)
- if `TIMELINE_FOR_AGENT_LOCALE` is not set, the default locale is English

### Where the category labels come from

- categories come from `timeline-taxonomy.json`
- if no custom taxonomy exists yet, the project creates and uses the built-in default taxonomy
- writing can also introduce new `eventNode` proposals, which are added to taxonomy and recorded for review

### What users usually run

- `timeline-for-agent build`
  build the static dashboard into `site/`
- `timeline-for-agent serve [--port 4317]`
  start the static dashboard server
- `timeline-for-agent dev [--port 4317]`
  watch source and data files, then rebuild and hot reload
- `timeline-for-agent screenshot`
  build, start a temporary local server, and capture a screenshot

<a id="agent-guide"></a>
## Agent Guide

### Command entrypoints

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

If the repo is not installed globally, replace those with:

```bash
node ./bin/timeline-for-agent.js <command>
```

### Basic rules

- prefer the existing CLI before reading source code
- read source only when a command fails, the user explicitly asks for an implementation change, or a new capability is needed
- avoid editing raw JSON files directly unless the user explicitly wants manual data work

### Read and write workflow

- if category / subcategory / eventNode choice is unclear, run `timeline-for-agent categories` first
- if the task is adding new content and the date, location, and intent are already clear, you can go straight to `timeline-for-agent write`
- if the task is modifying, removing, replacing, or auditing existing content, run `timeline-for-agent read --date YYYY-MM-DD` first
- `read` returns controlled day-level events only, not the full raw facts or taxonomy
- after confirming which events need to change, run `timeline-for-agent write`
- if you need to inspect newly introduced event node proposals, run `timeline-for-agent proposals`

### Write constraints

- every event must stay within the target `date`
- every event must include `startAt` and `endAt`
- every event must satisfy one of these:
  - provide `eventNodeId`
  - provide `subcategoryId`, preferably together with `categoryId`
- if usable category information is missing, the write fails instead of silently dropping the event
- if sleep crosses `00:00`, split it into two events:
  - the early-morning segment belongs to that day's opening hours
  - the late-night segment belongs to that day's closing hours
- do not create one event that runs from late night directly into the next morning

<a id="screenshots"></a>
## Screenshots

- `screenshot` runs `build`, starts a temporary server, and captures the page
- the default output directory is `~/.timeline-for-agent/timeline/shots/`
- if browser discovery fails, set `TIMELINE_FOR_AGENT_CHROME_PATH`
- if the user wants distribution over time for a category or detail, prefer `--selector analytics`
- use `--selector events` only when the user explicitly wants the event card list

Examples:

```bash
timeline-for-agent screenshot --selector main
timeline-for-agent screenshot --selector timeline
timeline-for-agent screenshot --range day --date 2026-04-05 --selector timeline
timeline-for-agent screenshot --range month --month 2026-04 --selector analytics
timeline-for-agent screenshot --range week --category Work --detail Coding --selector analytics
timeline-for-agent screenshot --range week --category Work --detail Coding --selector events
```

Further docs:

- shared agent constraints: [agent-instructions.md](./docs/agent-instructions.md)
- future MCP tool descriptions: [mcp-tool-descriptions.md](./docs/mcp-tool-descriptions.md)

## License

This project is designed for local-first personal deployment. Timeline data usually contains highly private information about routines, health, and long-term behavior patterns. I do not want that data flow repackaged into a closed SaaS layer that hides both code and data paths from the user.

Because of that, the project is released under `AGPL-3.0-only`. If you modify it, extend it, and provide it to users over a network, you must provide the full corresponding source code under AGPL terms.
