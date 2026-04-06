const { readTimelineDay } = require("../application/timeline/read-day");

async function runTimelineReadCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await readTimelineDay(config, { date: options.date });
  console.log(JSON.stringify(result, null, 2));
}

function parseArgs(args) {
  const options = {
    help: false,
    date: "",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || "").trim();
    if (!arg) {
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    const value = String(args[index + 1] || "");
    if (!value || value.startsWith("--")) {
      throw new Error(`参数缺少值: ${arg}`);
    }
    if (arg === "--date") {
      options.date = value.trim();
    } else {
      throw new Error(`未知参数: ${arg}`);
    }
    index += 1;
  }

  return options;
}

function printHelp() {
  console.log(`
用法: timeline-for-agent read --date YYYY-MM-DD

用途:
  - 读取某一天当前已有的时间轴事件
  - 供 agent 或用户在修改前先查看目标日期，而不是直接读取原始 JSON

返回内容:
  - date
  - exists
  - status
  - updatedAt
  - eventCount
  - events

说明:
  - 这里只返回目标日期的受控数据，不返回完整 facts 或 taxonomy
  - 修改某天前，推荐先执行 read，再执行 write
`);
}

module.exports = { runTimelineReadCommand };
