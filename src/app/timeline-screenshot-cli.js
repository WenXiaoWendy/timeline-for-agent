const path = require("path");

const {
  captureTimelineScreenshot,
  SCREENSHOT_SELECTOR_MAP,
  resolveTimelineScreenshotOptions,
} = require("../application/timeline/capture-screenshot");

async function runTimelineScreenshotCommand(config) {
  const options = parseArgs(process.argv.slice(3), config);
  if (options.help) {
    printHelp();
    return;
  }
  const result = await captureTimelineScreenshot(config, options);
  console.log(`timeline screenshot saved: ${result.outputFile}`);
}

function parseArgs(args, config) {
  const options = { help: false };

  for (let index = 0; index < args.length; index += 1) {
    const token = String(args[index] || "").trim();
    if (!token) {
      continue;
    }
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    if (token === "--output") {
      options.outputFile = path.resolve(requireValue(token, args[index + 1]));
      index += 1;
      continue;
    }
    if (token === "--selector") {
      options.selector = requireValue(token, args[index + 1]).trim();
      index += 1;
      continue;
    }
    if (token === "--width") {
      options.width = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--height") {
      options.height = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    if (token === "--side-padding") {
      options.sidePadding = requireValue(token, args[index + 1]);
      index += 1;
      continue;
    }
    throw new Error(`未知参数: ${token}`);
  }

  if (options.help) {
    return options;
  }

  return {
    ...resolveTimelineScreenshotOptions(config, options),
    help: false,
  };
}

function requireValue(token, value) {
  const normalized = String(value || "").trim();
  if (!normalized || normalized.startsWith("--")) {
    throw new Error(`参数缺少值: ${token}`);
  }
  return normalized;
}

function printHelp() {
  console.log(`
用法: timeline-for-agent screenshot [--output ./timeline-shot.png] [--selector timeline|analytics|events|CSS]

局部截图 selector:
  - timeline   时间轴区域，包含范围切换和时间轴面板
  - analytics  类别分布、子类明细和趋势三块分析区
  - events     事件明细区

自然语言映射建议:
  - “截时间轴” / “只截 timeline”           -> --selector timeline
  - “截类别明细趋势” / “截分析区”         -> --selector analytics
  - “截事件” / “只截事件列表”             -> --selector events

也可以直接传自定义 CSS selector，例如:
  timeline-for-agent screenshot --selector ".pie-chart-shell"

当前内置映射:
${Object.entries(SCREENSHOT_SELECTOR_MAP)
    .map(([key, value]) => `  - ${key} => ${value}`)
    .join("\n")}
`);
}

module.exports = { runTimelineScreenshotCommand };
