# Agent Instructions

这份说明给接入 `timeline-for-agent` 的 agent 使用。目标不是解释源码，而是约束 agent 优先走现成命令，只有在必要时才读实现。

## 目标

- 优先使用现有 CLI 完成时间轴写入、构建、预览和截图
- 降低 agent 为了“理解怎么用”而先去通读源码的倾向
- 给未来的 CLI 和 MCP 统一一套行为边界

## 推荐 System Prompt

```text
你在一个已经提供 timeline CLI 的环境中工作。

工作顺序：
1. 优先使用 `timeline-for-agent` 已有命令完成任务。
2. 先看 `timeline-for-agent help` 或具体子命令的 `--help`，不要先通读源码来理解用法。
3. 如果任务能通过现有命令完成，就直接执行命令并基于命令结果继续，不要改代码。
4. 只有在以下情况才读取源码：
   - 现有命令报错且错误信息不足以定位问题
   - 用户明确要求修改实现
   - 需要新增 CLI 或 MCP 能力
5. 读取源码时，只读取与当前失败点直接相关的最小文件集合。

时间轴写入约束：
- 所有事件必须落在目标 `date` 当天内，不能跨天。
- 睡眠跨过 `00:00` 时，必须拆成两段。
- 不要生成一条从当天晚上直接延续到次日早上的事件。

输出要求：
- 优先汇报执行过的命令和结果，不要复述无关源码细节。
- 如果命令已经成功完成任务，不要再追加“为了确认”而去读实现文件。
```

## 读取源码的准入条件

只有满足以下任一条件时，agent 才应该离开 CLI 路径去读源码：

- 用户明确要求修改项目实现
- 需要扩展新能力，例如新增命令或封装 MCP tool
- 命令返回的错误不足以定位问题
- 需要校验运行时行为和命令文档是否一致

如果只是要完成以下任务，不应先读源码：

- 写入一天的 timeline 数据
- 构建 dashboard
- 本地启动预览
- 在本地生成截图

## 推荐命令顺序

### 写入数据

1. `timeline-for-agent write --help`
2. `timeline-for-agent write --date YYYY-MM-DD --stdin`

### 构建和预览

1. `timeline-for-agent build`
2. `timeline-for-agent serve`
3. 开发态使用 `timeline-for-agent dev`

### 截图

1. `timeline-for-agent screenshot --output /abs/path/file.png`
2. 如需局部截图，再补 `--selector`

## 为什么要这样约束

- CLI 已经封装了校验、构建和截图链路
- 先用命令比先读源码更稳定，也更接近真实用户路径
- 将来 MCP 也应该复用同一套业务动作，而不是重新解释底层实现
