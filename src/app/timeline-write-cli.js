const { TimelineStore } = require("../infra/timeline/timeline-store");

async function runTimelineWriteCommand(config) {
  const options = parseArgs(process.argv.slice(3));
  if (options.help) {
    printHelp();
    return;
  }

  const body = await resolveBody(options);
  if (!body) {
    throw new Error("timeline-write 需要 JSON，传 --json 或通过 stdin 输入");
  }

  const payload = parsePayload(body);
  const date = String(options.date || payload.date || "").trim();
  if (!date) {
    throw new Error("timeline-write 缺少日期，传 --date YYYY-MM-DD 或在 JSON 里带 date");
  }

  const store = new TimelineStore({
    taxonomyFilePath: config.timelineTaxonomyFile,
    factsFilePath: config.timelineFactsFile,
    legacyFilePath: config.timelineDbFile,
  });

  const mode = options.mode || String(payload.mode || "merge").trim().toLowerCase() || "merge";
  const common = {
    date,
    status: options.finalize ? "final" : payload.status || "",
    source: payload.source || null,
    events: Array.isArray(payload.events) ? payload.events : [],
    newEventNodes: Array.isArray(payload.newEventNodes) ? payload.newEventNodes : [],
  };

  const saved = mode === "replace"
    ? store.replaceDay(common)
    : store.mergeDay({
      ...common,
      dropEventIds: Array.isArray(payload.dropEventIds) ? payload.dropEventIds : [],
    });

  if (options.finalize) {
    store.finalizeDay(date);
  }

  console.log(`timeline written: ${date}`);
  console.log(`mode: ${mode}`);
  console.log(`events: ${saved.events.length}`);
  console.log(`status: ${options.finalize ? "final" : saved.status}`);
}

function parseArgs(args) {
  const options = {
    help: false,
    date: "",
    json: "",
    mode: "",
    finalize: false,
    useStdin: false,
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
    if (arg === "--finalize") {
      options.finalize = true;
      continue;
    }
    if (arg === "--stdin") {
      options.useStdin = true;
      continue;
    }
    const value = String(args[index + 1] || "");
    if (!value || value.startsWith("--")) {
      throw new Error(`参数缺少值: ${arg}`);
    }
    if (arg === "--date") {
      options.date = value.trim();
    } else if (arg === "--json") {
      options.json = value.trim();
    } else if (arg === "--mode") {
      options.mode = value.trim();
    } else {
      throw new Error(`未知参数: ${arg}`);
    }
    index += 1;
  }

  return options;
}

async function resolveBody(options) {
  if (String(options.json || "").trim()) {
    return options.json.trim();
  }
  if (!options.useStdin && process.stdin.isTTY) {
    return "";
  }
  return readStdin();
}

function parsePayload(body) {
  const normalized = String(body || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(normalized);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("timeline-write JSON 必须是对象");
  }
  return parsed;
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let buffer = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      buffer += chunk;
    });
    process.stdin.on("end", () => resolve(buffer));
    process.stdin.on("error", reject);
  });
}

function printHelp() {
  console.log(`
用法: timeline-for-agent write --date YYYY-MM-DD [--mode merge|replace] [--json '{"events":[...]}']
  或: cat payload.json | timeline-for-agent write --date YYYY-MM-DD --stdin

事件建议:
  - title: 短标题，直接显示在时间轴块里
  - note: 详细备注，写背景、上下文和补充描述

时间约束:
  - 所有事件必须落在当前 date 这一天内，不能跨天
  - 睡眠如果跨过 00:00，必须拆成两段：
    凌晨睡眠写到当天前半夜，夜间睡眠写到当天后半夜
  - 不要生成一条从当天晚上直接延续到次日早上的事件

示例 JSON:
  {
    "date": "2026-04-05",
    "events": [
      {
        "id": "evt_demo_1",
        "startAt": "2026-04-05T09:00:00+08:00",
        "endAt": "2026-04-05T09:45:00+08:00",
        "title": "早餐和出门准备",
        "note": "起床后洗漱、吃早餐，收拾东西准备出门。",
        "categoryId": "life",
        "subcategoryId": "life.daily",
        "tags": ["早餐", "出门前"]
      }
    ]
  }
`);
}

module.exports = { runTimelineWriteCommand };
