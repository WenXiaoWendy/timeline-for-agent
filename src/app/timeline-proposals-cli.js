const { listTimelineProposals } = require("../application/timeline/list-proposals");

async function runTimelineProposalsCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const result = await listTimelineProposals(config, { date: options.date });
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
用法: timeline-for-agent proposals [--date YYYY-MM-DD]

用途:
  - 查看写入时顺带新增的 eventNode 提案
  - 供排查“为什么出现了新节点”或“某天新增了哪些候选节点”

说明:
  - 不传 --date 时返回全部 proposals
  - 传 --date 时只返回对应日期的 proposals
`);
}

module.exports = { runTimelineProposalsCommand };
